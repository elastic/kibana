/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Single-file UI for browsing a campaign (ported from `@kbn/esql-harness-opt`).
 *
 * Kept as a template string rather than a bundled app on purpose: the report has to be openable
 * from any machine, months later, with no build step and no server — including by someone who
 * only has the HTML file.
 */
export const reportTemplate = (payload: string): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Nightshift investigation harness optimization</title>
<style>
:root { color-scheme: dark; --bg:#0b0f14; --panel:#141b23; --panel2:#1b242e; --line:#2a3744;
        --fg:#e6edf3; --muted:#90a4b7; --good:#46d17d; --bad:#ff6b63; --warn:#e3b341; --accent:#6cb6ff; }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--fg);
       font:13px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace; }
a { color:var(--accent); }
header { display:flex; align-items:center; gap:20px; padding:12px 20px; border-bottom:1px solid var(--line); }
header h1 { font-size:14px; margin:0; letter-spacing:.04em; text-transform:uppercase; }
header .tabs { display:flex; gap:4px; margin-left:auto; }
header button { background:var(--panel); color:var(--fg); border:1px solid var(--line); border-radius:6px;
                padding:5px 12px; cursor:pointer; font:inherit; }
header button.active { background:var(--accent); color:#06121f; border-color:var(--accent); }
main { padding:18px 20px 60px; max-width:1500px; }
h2 { font-size:15px; margin:0 0 4px; }
h3 { font-size:13px; margin:22px 0 6px; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; }
.muted { color:var(--muted); }
.good { color:var(--good); } .bad { color:var(--bad); } .warn { color:var(--warn); }
table { border-collapse:collapse; width:100%; margin:8px 0 10px; }
th,td { text-align:left; padding:6px 10px; border-bottom:1px solid var(--line); vertical-align:top; }
th { color:var(--muted); font-weight:500; white-space:nowrap; cursor:pointer; }
tbody tr:hover { background:var(--panel); }
pre { background:var(--panel); border:1px solid var(--line); border-radius:6px; padding:9px 11px;
      white-space:pre-wrap; word-break:break-word; margin:4px 0; }
.cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; margin:10px 0 4px; }
.card { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:9px 12px; }
.card .k { color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.05em; }
.card .v { font-size:17px; margin-top:2px; }
.pill { display:inline-block; padding:1px 8px; border-radius:999px; border:1px solid var(--line); font-size:11px; }
hr.rule { border:0; border-top:1px solid var(--line); margin:18px 0; }
.pill.good { border-color:var(--good); } .pill.bad { border-color:var(--bad); } .pill.warn { border-color:var(--warn); }
.accent { color:var(--accent); }
.timeline { display:flex; gap:10px; overflow-x:auto; padding:6px 0 12px; }
.node { min-width:190px; background:var(--panel); border:1px solid var(--line); border-left:3px solid var(--line);
        border-radius:8px; padding:10px 12px; cursor:pointer; }
.node.accepted { border-left-color:var(--good); } .node.rejected { border-left-color:var(--bad); }
.node:hover { background:var(--panel2); }
.gnode { cursor:pointer; } .gnode:hover rect:first-of-type { fill:#1b242e; }
.split { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.diff-add { background:rgba(70,209,125,.12); border-left:2px solid var(--good); padding-left:6px; }
.diff-del { background:rgba(255,107,99,.12); border-left:2px solid var(--bad); padding-left:6px; }
.bar { height:6px; border-radius:3px; background:var(--panel2); overflow:hidden; min-width:60px; }
.bar > div { height:100%; background:var(--accent); }
input[type=search], select { background:var(--panel); border:1px solid var(--line); color:var(--fg);
       border-radius:6px; padding:5px 9px; font:inherit; }
.toolbar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin:8px 0; }
details > summary { cursor:pointer; color:var(--accent); }
.back { cursor:pointer; color:var(--accent); }
code { background:var(--panel2); padding:1px 5px; border-radius:4px; }
</style>
</head>
<body>
<header>
  <h1>Nightshift investigation harness optimization</h1>
  <span class="muted" id="subtitle"></span>
  <div class="tabs" id="tabs"></div>
</header>
<main id="view"></main>
<script id="payload" type="application/json">${payload}</script>
<script>
const DATA = JSON.parse(document.getElementById('payload').textContent);
const el = document.getElementById('view');
const NL = String.fromCharCode(10);
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const n = (v, d = 3) => (typeof v === 'number' && isFinite(v) ? v.toFixed(d) : '—');
const usd = (v, d = 2) => (typeof v === 'number' && isFinite(v) ? '$' + v.toFixed(d) : '—');
const pct = (v) => (typeof v === 'number' ? Math.round(v * 100) + '%' : '—');
const sign = (v, d = 3) => (typeof v === 'number' ? (v >= 0 ? '+' : '') + v.toFixed(d) : '—');
const cls = (v) => (typeof v !== 'number' ? 'muted' : v > 0.001 ? 'good' : v < -0.001 ? 'bad' : 'muted');
const rewardCls = (v) => (typeof v !== 'number' ? 'muted' : v >= 0.95 ? 'good' : v > 0.4 ? 'warn' : 'bad');
const shortPath = (path) => String(path).split('/').slice(-1)[0];
const goAttr = (route) => 'data-go="' + esc(JSON.stringify(route)) + '"';
// Served (report --serve), traces are one click away; opened as a file, the path is shown.
const SERVED = location.protocol.startsWith('http');
const traceLink = (path) => path
  ? (SERVED ? '<a target="_blank" href="/trace?path=' + encodeURIComponent(path) + '">full trace ↗</a>'
            : '<span class="muted">' + esc(path) + '</span>')
  : '';

document.getElementById('subtitle').textContent =
  DATA.rounds.length + ' rounds · ' + DATA.runs.length + ' runs · ' + DATA.caseCount +
  ' cases · ' + DATA.ledgerFile + ' · rendered ' + DATA.generatedAt.replace('T', ' ').slice(0, 19);

/* ---------------------------------------------------------------- routing */
const TABS = [['campaign', 'Campaign'], ['rounds', 'Rounds'], ['runs', 'Runs'], ['cases', 'Cases'], ['splits', 'Splits']];
let route = { tab: 'campaign' };
const tabs = document.getElementById('tabs');
TABS.forEach(([id, label]) => {
  const b = document.createElement('button');
  b.textContent = label; b.dataset.tab = id; b.onclick = () => go({ tab: id });
  tabs.appendChild(b);
});
function go(next) {
  route = { ...next };
  [...tabs.children].forEach((b) => b.classList.toggle('active', b.dataset.tab === route.tab));
  render();
}
function render() {
  const fn = { campaign: viewCampaign, rounds: viewRounds, runs: viewRuns, cases: viewCases, splits: viewSplits }[route.tab];
  el.innerHTML = fn();
  el.querySelectorAll('[data-go]').forEach((node) => { node.onclick = () => go(JSON.parse(node.dataset.go)); });
  const filter = el.querySelector('#filter');
  if (filter) {
    filter.oninput = () => { route.q = filter.value; const at = filter.selectionStart; render();
      const f = el.querySelector('#filter'); f.focus(); f.setSelectionRange(at, at); };
  }
}

/* ------------------------------------------------------------- components */
const cards = (entries) => '<div class="cards">' + entries
  .map(([k, v, c]) => '<div class="card"><div class="k">' + k + '</div><div class="v ' + (c || '') + '">' + v + '</div></div>')
  .join('') + '</div>';

const verdict = (round) => round.rejectedReason
  ? '<span class="pill bad">' + esc(round.rejectedReason) + '</span>'
  : round.gate
    ? (round.gate.accepted && round.holdout && !round.holdout.passed
        ? '<span class="pill bad">won gate · failed holdout</span>'
        : round.gate.accepted
        ? '<span class="pill good">accepted · ' + esc(round.gate.acceptedVia) + '</span>'
        : round.forcedPromotion ? '<span class="pill warn">rejected · force-promoted</span>'
        : '<span class="pill bad">rejected</span>')
    : '<span class="pill">no gate</span>';

const renderDiff = (diff, files) => {
  if (!diff) return '<p class="muted">No diff recorded.</p>';
  const body = diff.split(NL).map((line) => {
    const c = line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff ') || line.startsWith('index ')
      ? 'muted' : line.startsWith('+') ? 'good' : line.startsWith('-') ? 'bad' : line.startsWith('@@') ? 'accent' : '';
    return '<span class="' + c + '">' + esc(line) + '</span>';
  }).join(NL);
  return '<p class="muted">' + (files || []).map(esc).join(', ') + '</p><pre>' + body + '</pre>';
};

/** One investigation: verdict line, flags, conclusion, link to the trajectory. */
const runBlock = (result, colour) =>
  '<div class="' + (colour || '') + '" style="margin:4px 0 10px">' +
  '<div><span class="' + rewardCls(result.reward) + '">reward ' + n(result.reward, 2) + '</span> · ' +
  (result.control ? 'control ' + n(result.control_score, 0)
    : 'acc ' + n(result.rcaAccuracy, 0) + ' / halluc ' + n(result.hallucination, 0)) +
  ' · ' + result.toolCalls + ' tool calls · ' + usd(result.costUsd) + ' · r' + result.rollout +
  (result.executionError ? ' · <span class="bad">' + esc(result.executionError.slice(0, 200)) + '</span>' : '') +
  ' · ' + traceLink(result.tracePath) + '</div>' +
  (result.control ? '' : '<div class="muted">named: ' + esc((result.namedFlags || []).join(', ') || '—') + '</div>') +
  (result.judge ? '<div class="muted">judge: ' + esc(result.judge) + '</div>' : '') +
  '<details><summary>conclusion</summary><pre>' + esc(result.conclusion || '(none)') + '</pre></details></div>';

/* ------------------------------------------------------------ lineage graph */
/**
 * The campaign is a tree of variants: every candidate is proposed from some incumbent, and only a
 * promoted one becomes the parent of the next generation. Rejected candidates stay as leaves on
 * the variant they were tried on.
 */
function lineageGraph() {
  const nodes = new Map();
  nodes.set(DATA.baseHash, { id: DATA.baseHash, label: 'start', sub: 'harness ' + DATA.baseHash,
    parent: null, state: 'base', round: null, delta: null, cost: null });
  const campaigns = [...new Set(DATA.rounds.map((round) => round.campaignId))];
  DATA.rounds.forEach((round) => {
    if (round.rejectedReason && !round.gate) {
      nodes.set('failed-' + round.round, { id: 'failed-' + round.round, label: 'round ' + round.round,
        sub: round.rejectedReason + ((round.failures || [])[0] ? ': ' + String(round.failures[0]).slice(0, 40) : ''),
        parent: round.parentHash, state: 'failed', round: round.round, delta: null, cost: null });
      return;
    }
    nodes.set(round.configHash + '-' + round.round, { id: round.configHash + '-' + round.round,
      label: 'round ' + round.round, sub: (round.filesChanged || []).map(shortPath).join(', ') || 'edit',
      parent: round.parentHash,
      state: round.promoted && !round.forcedPromotion ? 'accepted' : round.promoted ? 'forced' : 'rejected',
      round: round.round, delta: round.gate ? round.gate.meanDelta : null, cost: round.gate ? round.gate.costRatio : null });
  });
  // Only promoted candidates can be parents.
  const byHash = new Map([[DATA.baseHash, DATA.baseHash]]);
  DATA.rounds.forEach((round) => { if (round.promoted && round.configHash) byHash.set(round.configHash, round.configHash + '-' + round.round); });
  nodes.forEach((node) => {
    if (!node.parent) return;
    const parentId = byHash.has(node.parent) ? byHash.get(node.parent) : DATA.baseHash;
    node.parentId = parentId === node.id ? DATA.baseHash : parentId;
  });
  const depthCache = new Map();
  const depthOf = (node, seen = new Set()) => {
    if (!node || !node.parentId || seen.has(node.id)) return 0;
    if (depthCache.has(node.id)) return depthCache.get(node.id);
    seen.add(node.id);
    const depth = depthOf(nodes.get(node.parentId), seen) + 1;
    depthCache.set(node.id, depth);
    return depth;
  };
  const list = [...nodes.values()].map((node) => ({ ...node, depth: depthOf(node) }));
  const byDepth = new Map();
  list.forEach((node) => { byDepth.set(node.depth, [...(byDepth.get(node.depth) || []), node]); });
  const W = 210, H = 66, GX = 56, GY = 12;
  const position = new Map();
  [...byDepth.keys()].sort((a, b) => a - b).forEach((depth) => {
    byDepth.get(depth).sort((a, b) => (a.round ?? -1) - (b.round ?? -1)).forEach((node, index) => {
      position.set(node.id, { x: 10 + depth * (W + GX), y: 10 + index * (H + GY) });
    });
  });
  const placed = [...position.values()];
  const width = 20 + Math.max(...placed.map((p) => p.x)) + W;
  const height = 20 + Math.max(...placed.map((p) => p.y)) + H;
  const edges = list.filter((node) => node.parentId).map((node) => {
    const from = position.get(node.parentId), to = position.get(node.id);
    if (!from || !to) return '';
    const x1 = from.x + W, y1 = from.y + H / 2, x2 = to.x, y2 = to.y + H / 2, mid = (x1 + x2) / 2;
    const good = node.state === 'accepted' || node.state === 'forced';
    return '<path d="M' + x1 + ',' + y1 + ' C' + mid + ',' + y1 + ' ' + mid + ',' + y2 + ' ' + x2 + ',' + y2 +
      '" fill="none" stroke="' + (good ? '#46d17d' : '#2a3744') + '" stroke-width="' + (good ? 2 : 1.2) + '"/>';
  }).join('');
  const colour = { base: '#6cb6ff', accepted: '#46d17d', forced: '#e3b341', rejected: '#ff6b63', failed: '#e3b341' };
  const boxes = list.map((node) => {
    const p = position.get(node.id), stroke = colour[node.state];
    const deltaText = node.delta === null ? '' : sign(node.delta) + ' reward' + (node.cost ? ' · ' + node.cost.toFixed(2) + '× cost' : '');
    return '<g class="gnode" ' + (node.round !== null ? goAttr({ tab: 'rounds', round: node.round }) : '') +
      ' transform="translate(' + p.x + ',' + p.y + ')">' +
      '<rect width="' + W + '" height="' + H + '" rx="9" fill="#141b23" stroke="' + stroke + '" stroke-width="1.5"/>' +
      '<rect width="4" height="' + H + '" rx="2" fill="' + stroke + '"/>' +
      '<text x="14" y="22" fill="#e6edf3" font-size="13" font-weight="600">' + esc(node.label) + '</text>' +
      '<text x="14" y="41" fill="#90a4b7" font-size="11">' + esc(String(node.sub).slice(0, 32)) + '</text>' +
      '<text x="14" y="60" fill="' + stroke + '" font-size="11">' + esc(deltaText || node.state) + '</text></g>';
  }).join('');
  return '<div style="border:1px solid var(--line);border-radius:8px;background:var(--bg);padding:6px">' +
    '<svg viewBox="0 0 ' + width + ' ' + height + '" width="100%" height="' + Math.min(height, 620) +
    '" preserveAspectRatio="xMinYMin meet" style="display:block">' + edges + boxes + '</svg></div>' +
    '<p class="muted">' + (nodes.size - 1) + ' rounds across ' + campaigns.length + ' campaign(s). ' +
    'Green edges are acceptances (yellow: force-promoted for debugging); red nodes were measured and ' +
    'rejected, yellow-bordered failed nodes never reached the gate.</p>';
}

/* ------------------------------------------------------------- campaign */
function viewCampaign() {
  const accepted = DATA.rounds.filter((r) => r.promoted && !r.forcedPromotion).length;
  const gated = DATA.rounds.filter((r) => r.gate).length;
  return '<h2>Campaign</h2>' +
    cards([
      ['rounds', DATA.rounds.length],
      ['reached gate', gated],
      ['accepted', accepted, accepted ? 'good' : 'muted'],
      ['cases seen', DATA.caseCount],
      ['runs', DATA.runs.length],
      ['spend (all runs)', usd(DATA.totalCostUsd)],
    ]) +
    '<h3>Lineage — variants tried, and what was built on what</h3>' + lineageGraph() +
    '<h3>What each round proposed</h3>' +
    '<table><tr><th>campaign</th><th>round</th><th>files</th><th>Δ reward [CI]</th><th>incidents</th><th>exec</th><th>$/solved</th><th>review</th><th>verdict</th><th>rationale</th></tr>' +
    DATA.rounds.map((round) => {
      const g = round.gate;
      return '<tr ' + goAttr({ tab: 'rounds', round: round.round }) + ' style="cursor:pointer">' +
        '<td class="muted">' + esc(String(round.campaignId).slice(4, 12)) + '</td><td>' + round.round + '</td>' +
        '<td>' + esc((round.filesChanged || []).map(shortPath).join(', ')) + '</td>' +
        '<td class="' + cls(g ? g.meanDelta : null) + '">' + (g ? sign(g.meanDelta) + ' [' + n(g.ciLow) + ', ' + n(g.ciHigh) + ']' : '—') + '</td>' +
        '<td>' + (g ? g.seeds : '—') + '</td>' +
        '<td>' + (g ? pct(g.incumbentExecutionSuccess) + ' → ' + pct(g.candidateExecutionSuccess) : '—') + '</td>' +
        '<td>' + (g ? usd(g.incumbentCostPerSolved) + ' → ' + usd(g.candidateCostPerSolved) : '—') + '</td>' +
        '<td>' + (round.review ? '<span class="' + (round.review.verdict === 'allow' ? 'good' : 'bad') + '">' + esc(round.review.verdict) + '</span>' : '—') + '</td>' +
        '<td>' + verdict(round) + '</td>' +
        '<td class="muted">' + esc(String((round.failures || [])[0] || round.rationale || '').slice(0, 140)) + '</td></tr>';
    }).join('') + '</table>';
}

/* --------------------------------------------------------------- rounds */
const caseTable = (rows, title) => {
  if (!rows.length) return '<p class="muted">Not measured on both lanes.</p>';
  const sorted = rows.slice().sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0));
  return '<table><tr><th>Δ</th><th>reward</th><th>ORCA difficulty</th><th>case</th></tr>' + sorted.map((row) =>
    '<tr><td class="' + cls(row.delta) + '">' + sign(row.delta, 2) + '</td>' +
    '<td>' + n(row.incumbent, 2) + ' → ' + n(row.candidate, 2) + '</td>' +
    '<td class="muted">' + (row.control ? 'control' : esc(row.tier)) + '</td>' +
    '<td><details><summary>' + esc(row.caseId) + ' <span class="muted">(' + esc(row.incident) + ')</span></summary>' +
    '<pre>' + esc(row.question) + '</pre>' +
    (row.control ? '' : '<div class="muted">plausible: ' + esc((row.plausibleFlags || []).join(', ')) + '</div>') +
    '<div class="split"><div><div class="muted">incumbent</div>' + row.incumbentRuns.map((r) => runBlock(r, 'diff-del')).join('') +
    '</div><div><div class="muted">candidate</div>' + row.candidateRuns.map((r) => runBlock(r, 'diff-add')).join('') + '</div></div>' +
    '<p><a ' + goAttr({ tab: 'cases', caseId: row.caseId }) + '>full history for this case →</a></p></details></td></tr>'
  ).join('') + '</table>';
};

function viewRounds() {
  if (route.round === undefined) {
    return '<h2>Rounds</h2>' + DATA.rounds.map((round) =>
      '<p><a ' + goAttr({ tab: 'rounds', round: round.round }) + '>round ' + round.round + '</a> — ' +
      verdict(round) + ' ' + esc((round.filesChanged || []).map(shortPath).join(', ')) + '</p>').join('');
  }
  const round = DATA.rounds.find((r) => r.round === route.round);
  if (!round) return '<p>Round not found.</p>';
  const g = round.gate;
  const failureBlock = (round.failures || []).length
    ? '<h3>Why it never reached the gate</h3>' + round.failures.map((f) => '<pre class="bad">' + esc(String(f).slice(0, 4000)) + '</pre>').join('')
    : '';
  const reviewBlock = round.review
    ? '<h3>Review</h3><p class="' + (round.review.verdict === 'allow' ? 'good' : 'bad') + '">' + esc(round.review.verdict) +
      (round.review.unavailable ? ' (reviewer unavailable)' : '') + '</p>' +
      (round.review.reasons || []).map((r) => '<pre>' + esc(r) + '</pre>').join('')
    : '';
  return '<p class="back" ' + goAttr({ tab: 'campaign' }) + '>← campaign</p>' +
    '<h2>Round ' + round.round + ' ' + verdict(round) + '</h2>' +
    '<p class="muted">from ' + esc(round.parentHash) + ' → ' + esc(round.configHash) + ' · ' +
    esc(round.agentConnectorId || '') + ' · telemetry ' + esc(round.telemetryVariant || '') + '</p>' +
    failureBlock +
    (g ? cards([
      ['Δ reward', sign(g.meanDelta), cls(g.meanDelta)],
      ['95% CI', '[' + n(g.ciLow) + ', ' + n(g.ciHigh) + ']'],
      ['incidents', g.seeds],
      ['execution', pct(g.incumbentExecutionSuccess) + ' → ' + pct(g.candidateExecutionSuccess)],
      ['$ / solved', usd(g.incumbentCostPerSolved) + ' → ' + usd(g.candidateCostPerSolved)],
      ['cost ratio', n(g.costRatio, 2) + '×', g.costRatio > 1.1 ? 'bad' : 'good'],
      ['improved', (g.improvements || []).length, 'good'],
      ['regressed', (g.regressions || []).length, (g.regressions || []).length ? 'bad' : 'muted'],
    ]) : '') +
    (g && !g.accepted ? '<p class="bad">' + esc((g.reasons || []).join(' · ')) + '</p>' : '') +
    (round.holdout ? '<h3>customer0 holdout</h3>' + cards([
      ['result', round.holdout.passed ? 'passed' : 'failed', round.holdout.passed ? 'good' : 'bad'],
      ['Δ reward', sign(round.holdout.meanDelta), cls(round.holdout.meanDelta)],
      ['95% CI', '[' + n(round.holdout.ciLow) + ', ' + n(round.holdout.ciHigh) + ']'],
      ['incidents', round.holdout.incidents],
      ['reward', n(round.holdout.incumbentReward) + ' → ' + n(round.holdout.candidateReward)],
      ['execution', pct(round.holdout.incumbentExecutionSuccess) + ' → ' + pct(round.holdout.candidateExecutionSuccess)],
    ]) + (round.holdout.reasons.length ? '<p class="bad">' + esc(round.holdout.reasons.join(' · ')) + '</p>' : '') : '') +
    '<h3>What changed</h3>' + renderDiff(round.diff, round.filesChanged) +
    '<h3>Why (proposer rationale)</h3><pre>' + esc(round.rationale || '—') + '</pre>' +
    reviewBlock +
    '<h3>Predictions</h3><p class="muted">fixes: ' + esc(round.predictedFixes.join(', ') || '—') +
    '<br>regressions: ' + esc(round.predictedRegressions.join(', ') || '—') + '</p>' +
    (round.predictionCheck ? '<pre>' + esc(round.predictionCheck) + '</pre>' : '') +
    '<h3>Gate split — per case, worst first</h3>' + caseTable(round.gateCases || []) +
    '<h3>Search split — the cases the proposer read</h3>' + caseTable(round.searchCases || []) +
    '<h3>Runs in this round</h3>' +
    (round.runs || []).map((id) => '<p><a ' + goAttr({ tab: 'runs', run: id }) + '>' + esc(id) + '</a></p>').join('');
}

/* ----------------------------------------------------------------- runs */
function viewRuns() {
  if (route.run === undefined) {
    return '<h2>Runs</h2><table><tr><th>run</th><th>group</th><th>variant</th><th>reward</th><th>scored</th><th>exec</th><th>acc</th><th>halluc</th><th>control</th><th>cost</th><th>tools</th></tr>' +
      DATA.runs.slice().reverse().map((run) =>
        '<tr><td><a ' + goAttr({ tab: 'runs', run: run.id }) + '>' + esc(run.label) + '</a></td>' +
        '<td class="muted">' + esc(run.group) + '</td><td class="muted">' + esc(run.configHash) + '</td>' +
        '<td class="' + rewardCls(run.meanReward) + '">' + n(run.meanReward) + '</td>' +
        '<td>' + run.scoredRuns + '/' + run.results.length + '</td><td>' + pct(run.executionSuccessRate) + '</td>' +
        '<td>' + n(run.meanRcaAccuracy, 2) + '</td><td>' + n(run.meanHallucination, 2) + '</td><td>' + n(run.meanControl, 2) + '</td>' +
        '<td>' + usd(run.totalCostUsd) + '</td><td>' + n(run.meanToolCalls, 1) + '</td></tr>').join('') + '</table>';
  }
  const run = DATA.runs.find((r) => r.id === route.run);
  if (!run) return '<p>Run not found.</p>';
  const q = (route.q || '').toLowerCase();
  const rows = run.results
    .filter((r) => !q || (r.caseId + ' ' + r.question + ' ' + r.conclusion).toLowerCase().includes(q))
    .sort((a, b) => (a.reward ?? -1) - (b.reward ?? -1));
  return '<p class="back" ' + goAttr({ tab: 'runs' }) + '>← runs</p>' +
    '<h2>' + esc(run.label) + ' <span class="muted">' + esc(run.group) + '</span></h2>' +
    cards([
      ['reward', n(run.meanReward)], ['scored', run.scoredRuns + '/' + run.results.length],
      ['execution', pct(run.executionSuccessRate)], ['accuracy', n(run.meanRcaAccuracy, 2)],
      ['hallucination', n(run.meanHallucination, 2)], ['control', n(run.meanControl, 2)],
      ['cost', usd(run.totalCostUsd)], ['model', esc(run.agentConnectorId)], ['telemetry', esc(run.telemetryVariant)],
    ]) +
    '<div class="toolbar"><input id="filter" type="search" placeholder="filter case, question or conclusion" value="' +
    esc(route.q || '') + '" size="40"><span class="muted">' + rows.length + ' shown</span></div>' +
    '<table><tr><th>case</th><th>investigation</th></tr>' + rows.map((r) =>
      '<tr><td><a ' + goAttr({ tab: 'cases', caseId: r.caseId }) + '>' + esc(r.caseId) + '</a><div class="muted">' +
      esc(r.incident) + (r.control ? ' · control' : ' · plausible: ' + esc(r.plausibleFlags.join(', '))) + '</div></td>' +
      '<td>' + runBlock(r) + '</td></tr>').join('') + '</table>';
}

/* ---------------------------------------------------------------- cases */
function viewCases() {
  if (route.caseId === undefined) {
    const q = (route.q || '').toLowerCase();
    const rows = DATA.cases
      .filter((c) => !q || (c.caseId + ' ' + c.incident).toLowerCase().includes(q))
      .sort((a, b) => (a.meanReward ?? -1) - (b.meanReward ?? -1));
    return '<h2>Cases</h2><div class="toolbar"><input id="filter" type="search" placeholder="filter case or incident" value="' +
      esc(route.q || '') + '" size="40"></div>' +
      '<table><tr><th>mean reward</th><th></th><th>split</th><th>ORCA difficulty</th><th>runs</th><th>case</th></tr>' +
      rows.map((c) => '<tr><td class="' + rewardCls(c.meanReward) + '">' + n(c.meanReward, 2) + '</td>' +
        '<td><div class="bar"><div style="width:' + Math.round((c.meanReward ?? 0) * 100) + '%"></div></div></td>' +
        '<td class="muted">' + esc(c.split || '') + '</td><td class="muted">' + (c.control ? 'control' : esc(c.tier)) + '</td>' +
        '<td>' + c.scored + '/' + c.runs + '</td><td><a ' + goAttr({ tab: 'cases', caseId: c.caseId }) + '>' + esc(c.caseId) +
        '</a> <span class="muted">' + esc(c.incident) + '</span></td></tr>').join('') + '</table>';
  }
  const c = DATA.cases.find((x) => x.caseId === route.caseId);
  if (!c) return '<p>Case not found.</p>';
  return '<p class="back" ' + goAttr({ tab: 'cases' }) + '>← cases</p><h2>' + esc(c.caseId) + '</h2>' +
    cards([['mean reward', n(c.meanReward)], ['runs', c.scored + '/' + c.runs], ['split', esc(c.split || '—')],
           ['incident', esc(c.incident)], ['kind', c.control ? 'control' : esc(c.tier)]]) +
    '<h3>Question</h3><pre>' + esc(c.question) + '</pre>' +
    (c.control ? '' : '<p class="muted">plausible: ' + esc(c.plausibleFlags.join(', ')) + '</p>') +
    '<h3>Every run, oldest first</h3><table><tr><th>run</th><th>variant</th><th>investigation</th></tr>' +
    c.history.map((h) => '<tr><td><a ' + goAttr({ tab: 'runs', run: h.runId }) + '>' + esc(h.label) + '</a></td>' +
      '<td class="muted">' + esc(h.variant) + '</td><td>' + runBlock(h) + '</td></tr>').join('') + '</table>';
}

/* --------------------------------------------------------------- splits */
function viewSplits() {
  return '<h2>Splits</h2><p class="muted">Assigned by a salted hash of the ORCA incident, so no incident straddles ' +
    'two splits; the gate resamples incidents, not tasks.</p>' +
    '<table><tr><th>split</th><th>incidents</th><th>tasks</th><th>controls</th><th>which</th></tr>' +
    (DATA.splits || []).map((s) => '<tr><td>' + esc(s.split) + '</td><td>' + s.incidents.length + '</td><td>' + s.tasks +
      '</td><td>' + s.controls + '</td><td class="muted">' + esc(s.incidents.join(', ')) + '</td></tr>').join('') + '</table>';
}

go({ tab: 'campaign' });
</script>
</body>
</html>`;
