/* 음식물의 소화 여행 — 지도 그리기와 게임 진행
   지도 좌표계 : viewBox 0 0 1000 760 (마주 본 모습 : 화면 왼쪽이 몸의 오른쪽 → 간이 왼쪽, 위가 오른쪽) */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.getElementById('map');

  /* ── 관(음식물이 지나가는 길) ── */
  var TUBE = {
    eso:   [[500, 112], [500, 215], [565, 262]],
    duo:   [[585, 362], [535, 368], [515, 400], [528, 430], [575, 438], [610, 470], [650, 510]],
    small: [[650, 510], [370, 510], [370, 545], [650, 545], [650, 580], [370, 580], [370, 615], [650, 615], [650, 650], [332, 650]],
    large: [[315, 685], [315, 465], [715, 465], [715, 640], [640, 700], [540, 712], [500, 736]],
    bile:  [[460, 324], [490, 380], [512, 398]],      // 쓸개 → 소장 앞부분
    panc:  [[552, 402], [522, 401]]                   // 이자 → 소장 앞부분
  };

  /* ── 머무는 곳 7군데 ── */
  var STOPS = [
    { name: '입', info: '이로 음식물을 잘게 부수고, 침 속의 아밀레이스가 녹말을 엿당으로 분해해요.' },
    { name: '식도', info: '소화 효소가 나오지 않아요. 근육의 꿈틀 운동으로 음식물을 위로 보내요.' },
    { name: '위', info: '위액(펩신 + 염산)이 나와요. 펩신은 단백질을 분해하고, 염산은 펩신을 돕고 세균을 없애요.' },
    { name: '소장 앞부분', info: '이자에서 이자액(아밀레이스·트립신·라이페이스)이, 쓸개에서 쓸개즙이 들어와요. 쓸개즙은 간에서 만들어져 쓸개에 저장되고, 지방을 작은 알갱이로 만들어요.' },
    { name: '소장 (융털)', info: '소장 안쪽 벽의 소화 효소가 마지막으로 분해해요. 포도당·아미노산은 융털의 모세혈관으로, 지방산·모노글리세리드는 암죽관으로 흡수돼요.' },
    { name: '대장', info: '소화 효소가 나오지 않아요. 남은 물을 흡수하고, 찌꺼기로 대변을 만들어요.' },
    { name: '항문', info: '대변이 몸 밖으로 나가요. 소화 여행 끝!' }
  ];

  /* ── 이동 길 6개 (관 위의 점만 지나감) ── */
  var LEGS = [
    { gate: [500, 180], pts: [[500, 108], [500, 190]] },
    { gate: [535, 240], pts: [[500, 190], [500, 215], [565, 262], [620, 285], [648, 308]] },
    { gate: [600, 360], pts: [[648, 308], [620, 350], [585, 362], [535, 368], [515, 400]] },
    { gate: [528, 430], pts: [[515, 400], [528, 430], [575, 438], [610, 470], [650, 510], [370, 510], [370, 545], [650, 545], [650, 580], [510, 580]] },
    { gate: [370, 598], pts: [[510, 580], [370, 580], [370, 615], [650, 615], [650, 650], [332, 650], [315, 650], [315, 465], [515, 465]] },
    { gate: [715, 550], pts: [[515, 465], [715, 465], [715, 640], [640, 700], [540, 712], [500, 736]] }
  ];

  /* ── 영양소 상태 : STAGES[k] = 관문 k 개를 지난 뒤 (각 줄 [표시 종류, 글]) ── */
  var R = function (t) { return ['raw', t]; }, P = function (t) { return ['part', t]; }, A = function (t) { return ['abs', t]; };
  var ROWS = ['녹말', '단백질', '지방', '물'];
  var STAGES = [
    [R('녹말'), R('단백질'), R('지방'), R('많음')],
    [P('녹말 (일부가 엿당으로)'), R('단백질'), R('지방'), R('많음')],
    [P('녹말 (일부가 엿당으로)'), R('단백질'), R('지방'), R('많음')],
    [P('녹말 (일부가 엿당으로)'), P('단백질 (일부 분해됨)'), R('지방'), R('많음')],
    [P('엿당 (이자액의 아밀레이스)'), P('더 작게 분해됨 (트립신)'), P('작은 알갱이(쓸개즙) → 지방산 + 모노글리세리드(라이페이스)'), R('많음')],
    [A('포도당 → 모세혈관으로 흡수 ✔'), A('아미노산 → 모세혈관으로 흡수 ✔'), A('지방산·모노글리세리드 → 암죽관으로 흡수 ✔'), P('일부 흡수, 남은 물은 대장으로')],
    [A('포도당 → 모세혈관으로 흡수 ✔'), A('아미노산 → 모세혈관으로 흡수 ✔'), A('지방산·모노글리세리드 → 암죽관으로 흡수 ✔'), A('남은 물 대장에서 흡수 ✔')]
  ];
  var LOOK = [   // [반지름, 색, 이름표]
    [24, '#f0c36a', '음식물'], [22, '#eebd66', '음식물'], [22, '#eebd66', '음식물'], [21, '#e9b262', '음식물'],
    [19, '#e2a65a', '음식물'], [15, '#b98a4e', '찌꺼기'], [15, '#7a4a24', '대변']
  ];

  /* ── SVG 도우미 ── */
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    (parent || svg).appendChild(e);
    return e;
  }
  function text(x, y, s, attrs, parent) {
    var a = { x: x, y: y, 'text-anchor': 'middle', 'font-family': 'Malgun Gothic, sans-serif' };
    for (var k in attrs) a[k] = attrs[k];
    var t = el('text', a, parent); t.textContent = s; return t;
  }
  function ptsStr(p) { return p.map(function (q) { return q[0] + ',' + q[1]; }).join(' '); }
  function tube(p, color, w, edge) {
    el('polyline', { points: ptsStr(p), fill: 'none', stroke: edge, 'stroke-width': w + 6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
    el('polyline', { points: ptsStr(p), fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
    el('polyline', { points: ptsStr(p), class: 'flow' });   // 지나가는 방향(점선이 움직임)
  }

  /* ── 지도 그리기 ── */
  var foodG, foodBody, foodLabel, fxLayer, gateLayer, inset;
  function drawMap() {
    // 몸통과 머리
    el('path', { d: 'M300 170 Q500 150 700 170 Q755 180 758 240 L758 690 Q755 752 690 752 L310 752 Q245 752 242 690 L242 240 Q245 180 300 170 Z',
                 fill: '#fdebdf', stroke: '#e2b99f', 'stroke-width': 3 });
    el('rect', { x: 474, y: 138, width: 52, height: 40, fill: '#fdebdf', stroke: '#e2b99f', 'stroke-width': 3 });
    el('ellipse', { cx: 500, cy: 82, rx: 72, ry: 68, fill: '#fdebdf', stroke: '#e2b99f', 'stroke-width': 3 });
    el('rect', { x: 476, y: 170, width: 48, height: 12, fill: '#fdebdf' });   // 목과 몸통 이음새 가리기
    el('path', { d: 'M430 58 Q440 8 500 12 Q560 8 570 58 Q545 30 500 34 Q455 30 430 58 Z', fill: '#4a3527' });   // 머리카락
    el('circle', { cx: 475, cy: 64, r: 5, fill: '#333' });
    el('circle', { cx: 525, cy: 64, r: 5, fill: '#333' });

    // 간·쓸개·이자 (음식물이 지나가지 않는 소화 기관)
    el('path', { d: 'M265 215 Q380 190 490 215 Q505 250 470 280 Q400 312 290 305 Q258 290 265 215 Z', fill: '#a8552c', stroke: '#6e3016', 'stroke-width': 3 });
    text(375, 262, '간', { 'font-size': 26, 'font-weight': 'bold', fill: '#fff' });
    el('ellipse', { cx: 458, cy: 305, rx: 14, ry: 20, fill: '#5aa845', stroke: '#2f6b22', 'stroke-width': 2.5 });
    text(438, 318, '쓸개', { 'font-size': 15, 'font-weight': 'bold', fill: '#2f6b22', 'text-anchor': 'end' });
    el('path', { d: 'M550 398 Q560 386 600 396 L700 392 Q730 392 730 405 Q728 418 700 417 L600 418 Q560 422 550 410 Z', fill: '#f2c572', stroke: '#b98a2a', 'stroke-width': 2.5 });
    text(672, 411, '이자', { 'font-size': 14, 'font-weight': 'bold', fill: '#7a5200' });
    ductBile = duct(TUBE.bile, '#5aa845');
    ductPanc = duct(TUBE.panc, '#d9a030');

    // 위
    el('path', { d: 'M552 258 Q590 226 652 234 Q726 248 724 312 Q720 376 652 386 Q612 392 590 374 L582 352 Q612 344 616 314 Q612 284 562 276 Z',
                 fill: '#f59a8e', stroke: '#c0504d', 'stroke-width': 3 });
    text(690, 285, '위', { 'font-size': 26, 'font-weight': 'bold', fill: '#8e2b28' });

    // 식도·소장·대장 (소장을 먼저 그려 대장 뒤로 지나가게)
    tube(TUBE.eso, '#f4a7a0', 20, '#c0504d');
    tube(TUBE.duo, '#f7b267', 18, '#c07a2a');
    tube(TUBE.small, '#f7b267', 16, '#c07a2a');
    tube(TUBE.large, '#d9895b', 34, '#8f4d25');
    el('ellipse', { cx: 500, cy: 740, rx: 11, ry: 6, fill: '#5a2f1e' });   // 항문

    // 입 (식도 위에 그려서 입이 앞에 보이게)
    el('ellipse', { cx: 500, cy: 108, rx: 34, ry: 20, fill: '#9e1f33', stroke: '#6b1020', 'stroke-width': 2.5 });
    el('ellipse', { cx: 500, cy: 118, rx: 20, ry: 7, fill: '#e8697a' });
    el('rect', { x: 476, y: 90, width: 48, height: 7, rx: 2, fill: '#fff' });

    // 기관 이름
    text(545, 104, '입', { 'font-size': 20, 'font-weight': 'bold', fill: '#6b1020', 'text-anchor': 'start' });
    text(486, 205, '식도', { 'font-size': 16, 'font-weight': 'bold', fill: '#8e2b28', 'text-anchor': 'end' });
    text(505, 438, '소장 앞부분(십이지장)', { 'font-size': 13, 'font-weight': 'bold', fill: '#8a5210', 'text-anchor': 'end' });
    text(440, 603, '소장', { 'font-size': 15, 'font-weight': 'bold', fill: '#8a5210' });
    text(272, 575, '대장', { 'font-size': 20, 'font-weight': 'bold', fill: '#7a3c18', transform: 'rotate(-90 272 575)' });
    text(522, 745, '항문', { 'font-size': 15, 'font-weight': 'bold', fill: '#5a2f1e', 'text-anchor': 'start' });

    // 설명 글
    var notes = ['※ 마주 본 모습이에요.', '   간은 왼쪽, 위는 오른쪽에', '   그려져 있어요.', '',
                 '※ 소장은 대장 뒤쪽으로', '   지나가요.', '', '※ 기관의 크기와 모양은', '   단순하게 그렸어요.', '',
                 '※ 간·쓸개·이자는 음식물이', '   지나가지 않아요.', '   소화액만 보내 줘요.'];
    notes.forEach(function (s, i) { text(772, 200 + i * 19, s, { 'font-size': 13, fill: '#777', 'text-anchor': 'start', 'xml:space': 'preserve' }); });

    inset = drawVilli();
    fxLayer = el('g', {});
    gateLayer = el('g', {});
    drawFood();
  }

  function duct(p, color) {
    el('polyline', { points: ptsStr(p), fill: 'none', stroke: color, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    return p;
  }

  /* 융털 확대 그림 */
  function drawVilli() {
    var g = el('g', {});
    var box = el('rect', { x: 30, y: 455, width: 205, height: 292, rx: 14, fill: '#fff', stroke: '#ddd', 'stroke-width': 2 }, g);
    text(132, 480, '🔍 소장 안쪽 융털 확대', { 'font-size': 14, 'font-weight': 'bold', fill: '#8a5210' }, g);
    el('rect', { x: 42, y: 690, width: 181, height: 16, rx: 4, fill: '#f1a86a' }, g);
    el('path', { d: 'M85 692 L85 575 Q132 505 180 575 L180 692 Z', fill: '#f9c89b', stroke: '#c07a2a', 'stroke-width': 2.5 }, g);
    el('path', { d: 'M100 692 L100 580 Q132 532 165 580 L165 692', fill: 'none', stroke: '#d62839', 'stroke-width': 5 }, g);
    el('line', { x1: 132, y1: 692, x2: 132, y2: 572, stroke: '#e6b800', 'stroke-width': 8, 'stroke-linecap': 'round' }, g);
    text(40, 725, '━ 모세혈관 : 포도당·아미노산', { 'font-size': 12, 'font-weight': 'bold', fill: '#d62839', 'text-anchor': 'start' }, g);
    text(40, 741, '━ 암죽관 : 지방산·모노글리세리드', { 'font-size': 12, 'font-weight': 'bold', fill: '#b08a00', 'text-anchor': 'start' }, g);
    return box;
  }

  /* 음식물 캐릭터 */
  function drawFood() {
    foodG = el('g', {});
    el('ellipse', { cx: 2, cy: 4, rx: 22, ry: 20, fill: 'rgba(0,0,0,.18)', class: 'shadow' }, foodG);
    foodBody = el('circle', { cx: 0, cy: 0, r: 22, stroke: '#7a5020', 'stroke-width': 2.5 }, foodG);
    el('circle', { cx: -6, cy: -4, r: 2.6, fill: '#222' }, foodG);
    el('circle', { cx: 6, cy: -4, r: 2.6, fill: '#222' }, foodG);
    el('path', { d: 'M-5 4 Q0 9 5 4', fill: 'none', stroke: '#222', 'stroke-width': 2, 'stroke-linecap': 'round' }, foodG);
    foodLabel = text(0, 40, '음식물', { 'font-size': 13, 'font-weight': 'bold', fill: '#5a3a10', stroke: '#fff', 'stroke-width': 3, 'paint-order': 'stroke' }, foodG);
  }

  /* ── 상태 ── */
  var S = { stop: 0, stage: 0, x: 500, y: 108, moving: false, right: 0, wrong: 0, start: 0, timer: null, name: '', pools: [] };
  var ductBile, ductPanc;

  function placeFood(x, y) {
    S.x = x; S.y = y;
    foodG.setAttribute('transform', 'translate(' + x + ',' + y + ')');
  }
  function setStage(k) {
    var prev = STAGES[S.stage];
    S.stage = k;
    var look = LOOK[k];
    foodBody.setAttribute('r', look[0]);
    foodBody.setAttribute('fill', look[1]);
    foodG.querySelector('.shadow').setAttribute('rx', look[0]);
    foodG.querySelector('.shadow').setAttribute('ry', look[0] - 2);
    foodLabel.setAttribute('y', look[0] + 18);
    foodLabel.textContent = look[2];
    var tb = document.getElementById('nutri'); tb.innerHTML = '';
    STAGES[k].forEach(function (cell, i) {
      var tr = document.createElement('tr');
      if (prev[i][1] !== cell[1]) tr.className = 'changed';
      var a = document.createElement('td'); a.textContent = ROWS[i];
      var b = document.createElement('td'); var sp = document.createElement('span');
      sp.className = 'st ' + cell[0]; sp.textContent = cell[1]; b.appendChild(sp);
      tr.appendChild(a); tr.appendChild(b); tb.appendChild(tr);
    });
  }

  /* ── 오른쪽 판 ── */
  function renderPanel() {
    var st = STOPS[S.stop];
    document.getElementById('place').textContent = st.name;
    document.getElementById('placeInfo').textContent = st.info;
    var ol = document.getElementById('route'); ol.innerHTML = '';
    STOPS.forEach(function (s, i) {
      var li = document.createElement('li');
      li.textContent = s.name;
      li.className = i < S.stop ? 'done' : (i === S.stop ? 'cur' : 'todo');
      ol.appendChild(li);
    });
    var btn = document.getElementById('goBtn');
    btn.disabled = S.moving || S.stop >= LEGS.length;
    btn.textContent = S.stop >= LEGS.length ? '🏁 도착!' : '❓ 관문 ' + (S.stop + 1) + ' : ' + GATES[S.stop].title;
    document.getElementById('right').textContent = S.right;
    document.getElementById('wrong').textContent = S.wrong;
    inset.setAttribute('stroke', S.stop === 4 ? '#ffb300' : '#ddd');
    inset.setAttribute('stroke-width', S.stop === 4 ? 4 : 2);
    drawGate();
  }

  function drawGate() {
    gateLayer.innerHTML = '';
    if (S.moving || S.stop >= LEGS.length) return;
    var p = LEGS[S.stop].gate;
    var g = el('g', { class: 'gate-mark', transform: 'translate(' + p[0] + ',' + p[1] + ')' }, gateLayer);
    el('circle', { r: 17, fill: '#ffb300', class: 'ring' }, g);
    el('circle', { r: 15, fill: '#ffb300', stroke: '#fff', 'stroke-width': 3 }, g);
    text(0, 7, '?', { 'font-size': 20, 'font-weight': 'bold', fill: '#3a2a00' }, g);
    g.addEventListener('click', openQuiz);
  }

  /* ── 문제 ── */
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function idx(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }
  function newPools() { S.pools = GATES.map(function (g) { return shuffle(idx(g.questions.length)); }); }
  function nextQuestion() {             // 관문의 문제를 차례로(다 쓰면 다시 섞어서)
    var pool = S.pools[S.stop];
    if (!pool.length) pool.push.apply(pool, shuffle(idx(GATES[S.stop].questions.length)));
    return GATES[S.stop].questions[pool.shift()];
  }

  var box = document.getElementById('quizBox'), qNext = document.getElementById('qNext'), curQ = null, solved = false;
  function openQuiz() {
    if (S.moving || S.stop >= LEGS.length) return;
    showQuestion(nextQuestion());
    box.classList.add('show');
  }
  function showQuestion(q) {
    curQ = q; solved = false;
    document.getElementById('qGate').textContent = '관문 ' + (S.stop + 1) + ' · ' + GATES[S.stop].title
      + '  (' + STOPS[S.stop].name + ' → ' + STOPS[S.stop + 1].name + ')';
    document.getElementById('qText').textContent = q.q;
    var wrap = document.getElementById('qChoices'); wrap.innerHTML = '';
    shuffle(q.choices.map(function (s, i) { return { s: s, ok: i === 0 }; })).forEach(function (ch, i) {
      var b = document.createElement('button');
      b.textContent = '①②③④⑤'[i] + '  ' + ch.s;
      b.dataset.ok = ch.ok ? '1' : '';
      b.addEventListener('click', function () { answer(b); });
      wrap.appendChild(b);
    });
    var r = document.getElementById('qResult'); r.textContent = ''; r.className = 'result';
    qNext.hidden = true;
  }
  function answer(b) {
    document.querySelectorAll('#qChoices button').forEach(function (x) { x.disabled = true; if (x.dataset.ok) x.classList.add('right'); });
    var r = document.getElementById('qResult');
    if (b.dataset.ok) {
      solved = true; S.right++;
      r.className = 'result ok';
      r.innerHTML = '<b>⭕ 정답! 관문이 열렸어요.</b><br>';
      qNext.textContent = STOPS[S.stop + 1].name + '(으)로 이동하기 ▶';
    } else {
      S.wrong++; b.classList.add('wrong');
      r.className = 'result no';
      r.innerHTML = '<b>❌ 아쉬워요. 해설을 읽고 다른 문제에 도전해요.</b><br>';
      qNext.textContent = '다른 문제로 다시 도전';
    }
    r.appendChild(document.createTextNode(curQ.exp));
    qNext.hidden = false;
    renderPanel();
  }
  qNext.addEventListener('click', function () {
    if (solved) { box.classList.remove('show'); go(); }
    else showQuestion(nextQuestion());
  });
  document.getElementById('qClose').addEventListener('click', function () {
    box.classList.remove('show');
    if (solved) go();
  });

  /* ── 기관에서 일어나는 일(맞힌 뒤 떠나기 전에) ── */
  var ACTIONS = [
    { words: ['꼭꼭 씹기', '침 (아밀레이스)', '녹말 → 엿당'] },
    { words: ['꿈틀 운동', '소화 효소 없음'] },
    { words: ['위액', '펩신 : 단백질 분해', '염산 : 살균'] },
    { words: ['쓸개즙 : 지방을 작은 알갱이로', '이자액 : 아밀레이스·트립신·라이페이스'], ducts: true },
    { words: ['소장의 소화 효소', '포도당 · 아미노산', '지방산 · 모노글리세리드', '융털로 흡수!'], villi: true },
    { words: ['물 흡수', '찌꺼기 → 대변'], water: true }
  ];
  function go() {
    var i = S.stop, act = ACTIONS[i];
    S.moving = true; renderPanel();
    act.words.forEach(function (w, k) { setTimeout(function () { bubble(w, k); }, k * 420); });
    if (act.ducts) for (var d = 0; d < 4; d++) { along(ductBile, '#5aa845', 900, d * 300); along(ductPanc, '#d9a030', 600, d * 300 + 150); }
    if (act.villi) villiFlow();
    if (act.water) for (var w = 0; w < 5; w++) drift('물', '#2a78d6', S.x + (w - 2) * 14, S.y - 10, S.x + (w - 2) * 22, S.y - 55, w * 250);
    var wait = Math.max(1400, act.words.length * 420 + 900);
    setTimeout(function () { setStage(i + 1); move(); }, wait);
  }

  function bubble(s, k) {
    var side = k % 2 === 0 ? -1 : 1;
    var x0 = S.x + side * 30, y0 = S.y - 24 - Math.floor(k / 2) * 30;   // 왼쪽·오른쪽 번갈아, 두 개마다 한 줄 위로
    var t = text(x0, y0, s, { 'font-size': 15, 'font-weight': 'bold', fill: '#b34700', stroke: '#fff', 'stroke-width': 4, 'paint-order': 'stroke',
                              'text-anchor': side < 0 ? 'end' : 'start' }, fxLayer);
    animate(1700, function (f) { t.setAttribute('y', y0 - 8 * f); t.setAttribute('opacity', f < 0.75 ? 1 : (1 - f) * 4); }, function () { t.remove(); });
  }
  function drift(s, col, x0, y0, x1, y1, delay) {
    setTimeout(function () {
      var t = text(x0, y0, s, { 'font-size': 14, 'font-weight': 'bold', fill: col, stroke: '#fff', 'stroke-width': 3, 'paint-order': 'stroke' }, fxLayer);
      animate(1100, function (f) { t.setAttribute('x', x0 + (x1 - x0) * f); t.setAttribute('y', y0 + (y1 - y0) * f); t.setAttribute('opacity', f < 0.8 ? 1 : (1 - f) * 5); },
              function () { t.remove(); });
    }, delay || 0);
  }
  function along(p, col, dur, delay) {     // 관을 따라 방울이 흘러 들어감
    setTimeout(function () {
      var c = el('circle', { r: 5, fill: col, stroke: '#fff', 'stroke-width': 1.5 }, fxLayer);
      var segs = segments(p);
      animate(dur, function (f) { var q = pointAt(segs, f * segs.total); c.setAttribute('cx', q[0]); c.setAttribute('cy', q[1]); }, function () { c.remove(); });
    }, delay);
  }
  function villiFlow() {
    var list = [['포도당', '#d62839', 55, 520, 100, 640], ['아미노산', '#d62839', 210, 520, 165, 640],
                ['지방산', '#b08a00', 132, 505, 132, 640], ['모노글리세리드', '#b08a00', 132, 490, 132, 600]];
    list.forEach(function (m, k) { drift(m[0], m[1], m[2], m[3], m[4], m[5], k * 350); });
  }
  function animate(dur, step, done) {
    var t0 = null;
    (function f(ts) {
      if (t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur);
      step(k);
      if (k < 1) requestAnimationFrame(f); else if (done) done();
    })(performance.now());
  }

  /* ── 이동 ── */
  function segments(pts) {
    var segs = [], total = 0;
    for (var i = 1; i < pts.length; i++) {
      var L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      segs.push({ a: pts[i - 1], b: pts[i], s: total, L: L }); total += L;
    }
    segs.total = total; return segs;
  }
  function pointAt(segs, d) {
    var sg = segs[segs.length - 1];
    for (var k = 0; k < segs.length; k++) if (d <= segs[k].s + segs[k].L) { sg = segs[k]; break; }
    var f = sg.L ? Math.min(1, (d - sg.s) / sg.L) : 1;
    return [sg.a[0] + (sg.b[0] - sg.a[0]) * f, sg.a[1] + (sg.b[1] - sg.a[1]) * f];
  }
  var SPEED = 170;   // 초당 이동 거리(지도 단위)
  function move() {
    var segs = segments(LEGS[S.stop].pts);
    animate(segs.total / SPEED * 1000, function (f) { var q = pointAt(segs, f * segs.total); placeFood(q[0], q[1]); }, arrive);
  }
  function arrive() {
    S.moving = false; S.stop++;
    renderPanel();
    if (S.stop >= LEGS.length) finish();
  }

  /* ── 시작·끝 ── */
  function fmt(ms) { var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function reset() {
    S.stop = 0; S.right = 0; S.wrong = 0; S.moving = false; S.stage = 0;
    newPools();
    placeFood(500, 108);
    setStage(0);
    document.getElementById('time').textContent = '0:00';
    renderPanel();
  }
  function begin() {
    S.name = document.getElementById('nameIn').value.trim();
    document.getElementById('startBox').classList.remove('show');
    reset();
    S.start = Date.now();
    clearInterval(S.timer);
    S.timer = setInterval(function () { document.getElementById('time').textContent = fmt(Date.now() - S.start); }, 500);
    setTimeout(openQuiz, 400);
  }
  function finish() {
    clearInterval(S.timer);
    document.getElementById('endName').textContent = (S.name ? S.name + ' — ' : '') + '입에서 항문까지 소화 여행 완료';
    document.getElementById('endTime').textContent = fmt(Date.now() - S.start);
    document.getElementById('endRight').textContent = S.right + '개';
    document.getElementById('endWrong').textContent = S.wrong + '번';
    setTimeout(function () { document.getElementById('endBox').classList.add('show'); }, 700);
  }

  document.getElementById('goBtn').addEventListener('click', openQuiz);
  document.getElementById('startBtn').addEventListener('click', begin);
  document.getElementById('nameIn').addEventListener('keydown', function (e) { if (e.key === 'Enter') begin(); });
  document.getElementById('againBtn').addEventListener('click', function () {
    document.getElementById('endBox').classList.remove('show');
    begin();
  });

  drawMap();
  reset();

  // 검증용으로 내부 자료를 노출(화면에는 영향 없음)
  window.__DJ = { LEGS: LEGS, STOPS: STOPS, TUBE: TUBE, STAGES: STAGES, S: S };
})();
