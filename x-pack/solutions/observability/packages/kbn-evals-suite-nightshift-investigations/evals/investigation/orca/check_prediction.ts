/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* @notice
 * The ORCA grader port in @kbn/evals-suite-nightshift-investigations (`orca/check_prediction.ts`)
 * and its report instructions (`orca/report_prompt/orca_instructions.text`) are adapted from the
 * ORCA benchmark's public Harbor dataset `orca-bench/orca-bench`
 * (https://hub.harborframework.com/datasets/orca-bench/orca-bench): the verifier
 * `tests/check_prediction.py` and the task instructions `instruction.md`, from "ORCA: How Ready Are
 * Language Model Agents for Oncall?" by Albert Gong, Kyuseong Choi, Abhineet Agarwal, Jason
 * Schechner, Ryan Huang, Raj Agrawal, Anish Agarwal and Raaz Dwivedi (arXiv:2607.28545).
 * Licensed under the Creative Commons Attribution 4.0 International License,
 * https://creativecommons.org/licenses/by/4.0/
 * Changes: the verifier is ported from Python to TypeScript with its prompts, schemas and scoring
 * unchanged; the instructions ask for the report to be returned rather than written to
 * /app/report.md.
 */

/**
 * ORCA's verifier, `tests/check_prediction.py` of every task in the public Harbor dataset
 * `orca-bench/orca-bench` (CC BY 4.0, the ORCA-bench authors), ported to TypeScript: the judge
 * prompts and output schemas byte for byte, and the score maths. `check_prediction.test.ts` holds
 * the port to the Python's own output (`__fixtures__/generate_parity_fixtures.py`).
 *
 * Python's semantics are kept where the rubric data can reach them: `dict.get` defaults apply
 * only to a missing key, truthiness treats empty lists and objects as false, and values are
 * interpolated as f-strings would print them.
 */

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = Record<string, JsonValue>;

/** One rubric file, `tests/rubrics/<event_id>.json`. */
export type OrcaRubric = JsonObject;

/** `tests/expected.json`: the plausible events of an incident, or a control's quiet window. */
export interface OrcaExpected {
  events: Array<{ event_id: string; root_cause: string; event_time: string }>;
  current?: string;
  quiet_window_start?: string | null;
  quiet_window_end?: string | null;
}

export const JUDGE_PROMPT_MULTI_HEADER = `You are an expert SRE tasked with judging the quality of an AI-generated incident RCA report.

You are given:
1. **One or more** ground-truth rubrics. Each describes a plausible root cause, its incident time, mechanism, and symptoms. Several flags may have been active in the same window; the agent is credited if it correctly identifies **any one** of these rubrics.
2. The SRE agent's incident RCA report.

## SRE Agent's Incident RCA Report

{predictions}

## Ground-Truth Rubrics

{rubrics}

## Evaluation Questions

For **each rubric** in order, answer every question with true or false. Base your answer only on evidence in the agent's report; if the report does not cite the required evidence, answer false. The output must contain one entry per rubric, in the same order, and must preserve cluster order within each rubric exactly as listed.

For each rubric:

- \`incident_time_within_10min\`: Did the agent's timeline place the incident start within ±10 minutes of this rubric's \`incident_time\`?
- \`feature_flag_match\`: Did the agent identify this rubric's feature flag as a root cause? (The agent may name multiple flags; mark true if this flag is among them.)
- \`mechanism_match\`: Did the agent correctly explain this rubric's mechanism — how the flag propagates to the user-visible failure?
- For each metric/log/trace cluster listed for this rubric: per-cluster match flags as before.
- \`score\`: An integer 0-3 reflecting how well the report matches **this rubric specifically** (see the Per-Rubric Scoring Rubric at the end of this prompt).
`;

export const JUDGE_PROMPT_SCORING_FOOTER = `
## Per-Rubric Scoring Rubric

Assign each rubric a \`score\` from 0 to 3 reflecting how well the agent's report matches **that rubric specifically**:

- 0: AI findings are misaligned with this rubric's mechanism and completely miss this root cause
- 1: AI verifies incident description — the report confirms symptoms described in the task prompt but does not investigate further toward this root cause
- 2: AI makes correct progress beyond symptoms — the report identifies some of this rubric's ground-truth metrics, logs, or traces and moves toward this root cause, but does not fully identify it
- 3: AI nails this root cause — the report correctly identifies it, this rubric's mechanism, and the supporting signals

Scoring is based on content correctness only; do not penalize or reward for formatting, prose style, or structural polish. Materially incorrect or misleading claims count against the per-rubric score: if the report would otherwise score N for a rubric but also adds a materially wrong claim (e.g., invents an unrelated additional cause), drop that rubric's score to N-1 (floor at 0). The same fabricated claim therefore lowers every rubric's score uniformly. When applying this penalty, explicitly identify in your reasoning which specific claim is materially wrong — quote or paraphrase the offending text. Do not apply the penalty without naming the offending claim; missing detail or incomplete explanation does not qualify as a materially wrong claim. Naming several of the listed plausible root causes is **not** a materially wrong claim.

Respond with ONLY a JSON object matching the provided output schema.
`;

export const JUDGE_PROMPT_CONTROL = `You are an expert SRE judging whether an AI-generated incident RCA report makes a false-positive claim about an incident at the queried time.

The task is a **control task**: the user queried the system at \`current_time\` during a verified quiet period in which no problem-pattern feature flag is active. The agent's snapshot includes telemetry from before \`current_time\`, so it may legitimately describe past, resolved incidents. Past incidents are **not** false positives — only claims placing an incident inside the quiet window are.

## Queried time

\`current_time = {current_time}\`

## Quiet window (no flag active inside)

- \`quiet_window_start = {quiet_window_start}\` (inclusive lower bound; "null" means open-ended, i.e. no neighboring incident before \`current_time\`)
- \`quiet_window_end   = {quiet_window_end}\` (exclusive upper bound; "null" means open-ended, i.e. no neighboring incident after \`current_time\`)

## SRE Agent's Incident RCA Report

{predictions}

## Evaluation

Answer the single boolean question \`claims_incident_in_quiet_window\`:

- **true** iff the report places **any** incident — its start, ongoing period, or any reported timestamp of active impact — at a time **strictly inside** \`(quiet_window_start, quiet_window_end)\`. Examples that count as true:
  - Claiming the incident is currently ongoing at \`current_time\`.
  - Reporting a timeline entry with a UTC timestamp inside the quiet window.
  - Stating that the incident started or is still active at any time inside the window.
- **false** otherwise. In particular, the following are NOT false positives:
  - Describing a past, resolved incident whose start, end, and timeline entries all fall at or before \`quiet_window_start\`.
  - Describing a future incident whose entries all fall at or after \`quiet_window_end\`.
  - Saying "no incident occurred at \`current_time\`" while describing past context.
  - **Timeline entries that merely document when the user reported the issue** (e.g. "02:04 UTC — Incident reported by user", "22:00 ET — issue reported"). These describe the moment the complaint arrived, not active system impact. Ignore such entries when applying the rule above; only entries that describe the system actively failing or degraded count.

Treat the bounds as half-open: a reported time exactly equal to \`quiet_window_start\` or exactly equal to \`quiet_window_end\` is **outside** the quiet window (no false positive). An open-ended bound (null) is equivalent to \`-inf\` / \`+inf\` respectively.

In \`reasoning\`, briefly state the verdict; if \`claims_incident_in_quiet_window\` is true, quote or paraphrase the specific offending claim from the report.

Respond with ONLY a JSON object matching the provided output schema.
`;

/** Each defined bound of a control's quiet window moves this far inward before the judge sees it. */
export const CONTROL_QUIET_WINDOW_MARGIN_MIN = 10;

export const CONTROL_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    claims_incident_in_quiet_window: { type: 'boolean' },
    reasoning: { type: 'string' },
  },
  required: ['claims_incident_in_quiet_window', 'reasoning'],
  additionalProperties: false,
} as const;

// ---------------------------------------------------------------------------
// Python semantics
// ---------------------------------------------------------------------------

const isObject = (value: JsonValue | undefined): value is JsonObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** `dict.get(key, fallback)`: the fallback applies only when the key is missing, not when null. */
const get = (object: JsonValue | undefined, key: string, fallback: JsonValue = null): JsonValue =>
  isObject(object) && Object.prototype.hasOwnProperty.call(object, key) ? object[key] : fallback;

const truthy = (value: JsonValue | undefined): boolean => {
  if (Array.isArray(value)) return value.length > 0;
  if (isObject(value)) return Object.keys(value).length > 0;
  return Boolean(value);
};

const asList = (value: JsonValue): JsonValue[] => (Array.isArray(value) ? value : []);

/** `get(key, fallback) or fallback`, for the lists the verifier reads that way. */
const getList = (object: JsonValue | undefined, key: string): JsonValue[] =>
  asList(get(object, key, []) || []);

/** The value as an f-string prints it. Rubric data holds only scalars where this is used. */
const str = (value: JsonValue | undefined): string => {
  if (value === null || value === undefined) return 'None';
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return String(value);
    throw new Error(`ORCA rubric value ${value} is a float, which this port does not print`);
  }
  throw new Error('ORCA rubric value is a list or object, which this port does not print');
};

const codePoints = (value: string): number => [...value].length;

/** `str.strip()`. */
const strip = (value: string): string => value.replace(/^[\s\x1c-\x1f]+|[\s\x1c-\x1f]+$/gu, '');

// Built from a string: a regex literal holding U+2028 does not survive transpiling.
const LINE_BREAKS = new RegExp('\\r\\n|[\\n\\r\\v\\f\\x1c\\x1d\\x1e\\x85\\u2028\\u2029]', 'u');

/** `str.splitlines()`. */
const splitLines = (value: string): string[] => {
  const lines = value.split(LINE_BREAKS);
  if (lines.at(-1) === '') lines.pop();
  return lines;
};

const padRight = (value: string, width: number): string =>
  value + ' '.repeat(Math.max(0, width - codePoints(value)));

/**
 * `tabulate(rows, headers=headers, tablefmt="github")` for the tables the verifier renders: every
 * column holds text, so every column is left-aligned, and a cell with a line break becomes several
 * physical lines.
 */
export const tabulateGithub = (rows: readonly string[][], headers: readonly string[]): string => {
  // Like tabulate, the table is multiline when any cell held a line break before it was stripped.
  const multiline = [headers, ...rows].some((row) => row.some((cell) => /[\r\n]/.test(cell)));
  const cells = rows.map((row) => row.map(strip));
  const lineWidth = (cell: string) =>
    multiline ? Math.max(...cell.split(/[\r\n]/).map(codePoints)) : codePoints(cell);
  const widths = headers.map((header, column) =>
    Math.max(codePoints(header) + 2, ...cells.map((row) => lineWidth(row[column])))
  );
  const renderRow = (row: readonly string[]): string[] => {
    const cellLines = row.map((cell) => (multiline ? splitLines(cell) : [cell]));
    const height = Math.max(...cellLines.map((lines) => lines.length));
    return Array.from(
      { length: height },
      (_, index) =>
        `|${cellLines
          .map((lines, column) => ` ${padRight(lines[index] ?? '', widths[column])} `)
          .join('|')}|`
    );
  };
  return [
    ...renderRow(headers),
    `|${widths.map((width) => '-'.repeat(width + 2)).join('|')}|`,
    ...cells.flatMap(renderRow),
  ].join('\n');
};

/** `datetime.fromisoformat(value) + timedelta(minutes=minutes)).isoformat()`. */
export const shiftIsoMinutes = (value: string, minutes: number): string => {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:[.,](\d+))?)?(Z|[+-]\d{2}:?\d{2}(?::?\d{2})?)?$/.exec(
      value
    );
  if (!match) throw new Error(`Not an ISO 8601 time: ${value}`);
  const [, year, month, day, hour, minute, second = '0', fraction = '', offset] = match;
  // Wall-clock arithmetic in the value's own fixed offset, which a timedelta leaves unchanged.
  const shifted = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    ) +
      minutes * 60_000
  );
  const two = (part: number) => String(part).padStart(2, '0');
  const micros = fraction.padEnd(6, '0').slice(0, 6);
  const zone = !offset
    ? ''
    : offset === 'Z'
    ? '+00:00'
    : (() => {
        const digits = offset.slice(1).replace(/:/g, '');
        const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 6)].filter(
          (part, index) => index < 2 || (part && part !== '00')
        );
        return `${offset[0]}${parts.join(':')}`;
      })();
  return (
    `${String(shifted.getUTCFullYear()).padStart(4, '0')}-${two(shifted.getUTCMonth() + 1)}-` +
    `${two(shifted.getUTCDate())}T${two(shifted.getUTCHours())}:${two(shifted.getUTCMinutes())}:` +
    `${two(shifted.getUTCSeconds())}${/^0+$/.test(micros) ? '' : `.${micros}`}${zone}`
  );
};

/** `str.format` with named fields, in one pass so a substituted value is never read as a field. */
const format = (template: string, fields: Readonly<Record<string, string>>): string =>
  template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.prototype.hasOwnProperty.call(fields, name) ? fields[name] : placeholder
  );

// ---------------------------------------------------------------------------
// Rubric rendering (JSON -> markdown)
// ---------------------------------------------------------------------------

const formatLogClusters = (clusters: JsonValue[], lines: string[]): void => {
  for (const cluster of clusters) {
    const name = get(cluster, 'name', 'Unknown');
    const count = get(cluster, 'count');
    const suffix = count !== null ? ` (${str(count)} entries)` : '';
    lines.push(`#### ${str(name)}${suffix}`, '');

    const description = get(cluster, 'description', '');
    if (truthy(description)) lines.push(str(description), '');

    const cause = get(cluster, 'cause', '');
    if (truthy(cause)) lines.push(`**Cause:** ${str(cause)}`, '');

    const source = get(cluster, 'source', '');
    if (truthy(source)) lines.push(`**Source:** ${str(source)}`, '');

    const attrs = get(cluster, 'representative_attributes', {});
    if (truthy(attrs) && isObject(attrs)) {
      lines.push('**Representative attributes:**', '');
      const rows = Object.entries(attrs).map(([key, value]) => [`\`${key}\``, `\`${str(value)}\``]);
      lines.push(tabulateGithub(rows, ['Field', 'Value']), '');
    }

    const docs = asList(get(cluster, 'log_documents', []));
    if (docs.length > 0) {
      lines.push('**Log documents:**', '');
      const rows = docs.map((doc) => [
        `\`${str(get(doc, '_index'))}\``,
        `\`${str(get(doc, '_id'))}\``,
        str(get(doc, '@timestamp')),
      ]);
      lines.push(tabulateGithub(rows, ['_index', '_id', '@timestamp']), '');
    }
  }
};

const formatTraceClusters = (clusters: JsonValue[], lines: string[]): void => {
  for (const cluster of clusters) {
    const name = get(cluster, 'name', 'Unknown');
    const count = get(cluster, 'count');
    const suffix = count !== null ? ` (${str(count)} traces)` : '';
    lines.push(`#### ${str(name)}${suffix}`, '');

    const description = get(cluster, 'description', '');
    if (truthy(description)) lines.push(str(description), '');

    const cause = get(cluster, 'cause', '');
    if (truthy(cause)) lines.push(`**Cause:** ${str(cause)}`, '');

    const callChain = get(cluster, 'call_chain', '');
    if (truthy(callChain)) lines.push('**Call chain:**', '', '```', str(callChain), '```', '');

    const smokingGun = asList(get(cluster, 'smoking_gun', []));
    if (smokingGun.length > 0) {
      lines.push('**Smoking-gun error messages:**', '');
      for (const message of smokingGun) lines.push(`- ${str(message)}`);
      lines.push('');
    }

    const docs = asList(get(cluster, 'trace_documents', []));
    if (docs.length > 0) {
      lines.push('**Trace documents:**', '');
      const hasAction = docs.some((doc) => isObject(doc) && 'user_action' in doc);
      const headers = ['traceID', '@timestamp', ...(hasAction ? ['user_action'] : [])];
      const rows = docs.map((doc) => [
        `\`${str(get(doc, 'traceID'))}\``,
        str(get(doc, '@timestamp')),
        ...(hasAction ? [str(get(doc, 'user_action', ''))] : []),
      ]);
      lines.push(tabulateGithub(rows, headers), '');
    }
  }
};

const LAYER_DESCRIPTIONS: Readonly<Record<string, string>> = {
  root_cause: 'metric closest to the fault injection point',
  propagation: 'intermediate services reflecting the error through the call chain',
  symptom: 'user-facing impact visible to end users or clients',
  meta: 'feature flag counters or internal plumbing',
  unknown: 'unclassified',
};

const LAYER_ORDER = ['root_cause', 'propagation', 'symptom', 'meta', 'unknown'] as const;

const formatOnset = (offset: JsonValue): string => (offset === null ? 'N/A' : `+${str(offset)}s`);

const earliestOnset = (variants: JsonValue[]): number | null => {
  const offsets = variants
    .map((variant) => get(variant, 'onset_offset_seconds'))
    .filter((offset): offset is number => typeof offset === 'number');
  return offsets.length > 0 ? Math.min(...offsets) : null;
};

/** `str.title()` for the layer names. */
const title = (value: string): string =>
  value.replace(/[A-Za-z]+/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase());

const formatMetricsList = (metricsList: JsonValue[], lines: string[]): void => {
  const byLayer = new Map<string, JsonValue[]>();
  for (const family of metricsList) {
    const layer = str(get(family, 'signal_layer', 'unknown'));
    byLayer.set(layer, [...(byLayer.get(layer) ?? []), family]);
  }

  for (const layer of LAYER_ORDER) {
    const families = byLayer.get(layer) ?? [];
    if (families.length === 0) continue;

    const layerOnsets = families
      .map((family) => earliestOnset(asList(get(family, 'variants'))))
      .filter((onset): onset is number => onset !== null);
    const layerOnset =
      layerOnsets.length > 0 ? ` (earliest onset: ${formatOnset(Math.min(...layerOnsets))})` : '';
    lines.push(
      `**${title(layer.replace(/_/g, ' '))}** — ${LAYER_DESCRIPTIONS[layer] ?? ''}${layerOnset}`,
      ''
    );

    for (const family of families) {
      const variants = asList(get(family, 'variants'));
      const labels = get(family, 'defining_labels', {});
      const labelValues =
        truthy(labels) && isObject(labels) ? Object.values(labels).map(str).join(', ') : '';
      const labelPart = labelValues ? ` (${labelValues})` : '';
      lines.push(
        `#### ${str(get(family, 'metric_family'))} family${labelPart} — onset: ${formatOnset(
          earliestOnset(variants)
        )}`,
        ''
      );

      const firstDescription = variants.length > 0 ? get(variants[0], 'description', '') : '';
      if (truthy(firstDescription)) lines.push(str(firstDescription), '');

      for (const variant of variants) {
        lines.push(
          `- **${str(get(variant, 'type'))}** (onset: ${formatOnset(
            get(variant, 'onset_offset_seconds')
          )})`,
          `  \`${str(get(variant, 'query'))}\``,
          ''
        );
      }
    }
  }
};

/** `format_rubric(data)`: the rubric as markdown, without the frontend section. */
export const formatRubric = (data: OrcaRubric): string => {
  const lines: string[] = [];
  const flag = str(data.feature_flag);
  lines.push(`# ${flag}`, '', `**Feature flag:** \`${flag}\``, '');
  lines.push(`**Description:** ${str(data.description)}`, '');
  lines.push(`**Incident time:** ${str(data.incident_time)}`, '');
  lines.push('## Mechanism', '', str(data.mechanism), '');

  const interaction = get(data, 'interaction', '');
  if (truthy(interaction)) {
    lines.push(`**Interaction with other feature flags:** ${str(interaction)}`, '');
  }

  lines.push('## Evidence', '');
  const symptoms = data.symptoms;

  const metrics = asList(get(symptoms, 'metrics', []));
  lines.push('### Metrics', '');
  if (metrics.length > 0) formatMetricsList(metrics, lines);

  const logs = asList(get(symptoms, 'logs', []));
  lines.push('### Logs', '');
  if (logs.length > 0) formatLogClusters(logs, lines);

  const traces = asList(get(symptoms, 'traces', []));
  lines.push('### Traces', '');
  if (traces.length > 0) formatTraceClusters(traces, lines);

  return lines.join('\n');
};

// ---------------------------------------------------------------------------
// Judge prompt + output-schema builders
// ---------------------------------------------------------------------------

/** `_render_checklist(rubric_data)`: the per-cluster questions for one rubric. */
export const renderChecklist = (rubric: OrcaRubric): string => {
  const symptoms = get(rubric, 'symptoms', {}) || {};
  const metricClusters = getList(symptoms, 'metrics');
  const logClusters = getList(symptoms, 'logs');
  const traceClusters = getList(symptoms, 'traces');

  const blocks: string[] = [];

  if (metricClusters.length > 0) {
    const lines = ['#### Metric clusters'];
    metricClusters.forEach((metric, index) => {
      const family = str(get(metric, 'metric_family', ''));
      lines.push(
        `- Cluster ${index}: \`metric_family = "${family}"\`` +
          ` — family_match: did the agent cite a query targeting` +
          ` metric_family \`${family}\` under a Why-step whose causal chain` +
          ` aligns with the rubric?`
      );
    });
    blocks.push(lines.join('\n'));
  }

  if (logClusters.length > 0) {
    const lines = ['#### Log clusters'];
    logClusters.forEach((log, index) => {
      const attrs = get(log, 'representative_attributes') || {};
      const body = str(get(attrs, 'body', ''));
      const serviceName = str(get(attrs, 'resource.service.name', ''));
      lines.push(
        `- Cluster ${index}:\n` +
          `  - \`resource.service.name\`: \`${serviceName}\`\n` +
          `  - \`body\`: \`${body}\`\n` +
          `  - body_match: did the agent cite log evidence whose body` +
          ` matches the rubric's \`body\` under a Why-step whose causal` +
          ` chain aligns with the rubric?\n` +
          `  - service_name_match: did the agent attribute the cited` +
          ` log evidence to the OTel service \`${serviceName}\`` +
          ` (\`resource.service.name\`)?`
      );
    });
    blocks.push(lines.join('\n'));
  }

  if (traceClusters.length > 0) {
    const lines = ['#### Trace clusters'];
    traceClusters.forEach((trace, index) => {
      const callChain = str(get(trace, 'call_chain', ''));
      const smokingGun = getList(trace, 'smoking_gun');
      const rendered = smokingGun.map((signal) => `    - ${str(signal)}`).join('\n');
      lines.push(
        `- Cluster ${index}:\n` +
          `  - call_chain: \`${callChain}\`\n` +
          `  - smoking_gun:\n${rendered}\n` +
          `  - call_chain_match: did the agent cite evidence matching` +
          ` this service-level call chain under a Why-step whose causal` +
          ` chain aligns with the rubric?\n` +
          `  - smoking_gun_match: did the agent cite at least one of` +
          ` the listed smoking-gun signals?`
      );
    });
    blocks.push(lines.join('\n'));
  }

  return blocks.length > 0 ? blocks.join('\n\n') : '(No metric, log, or trace clusters in rubric.)';
};

/** `build_judge_prompt(rubrics_data, predictions)`. Rubrics come in event-id order. */
export const buildJudgePrompt = (rubrics: readonly OrcaRubric[], predictions: string): string => {
  if (rubrics.length === 0) throw new Error('build_judge_prompt called with no rubrics');
  const heading = (rubric: OrcaRubric, index: number) =>
    `### Rubric ${index + 1} of ${rubrics.length} — \`${str(
      get(rubric, 'feature_flag', '')
    )}\`\n\n`;
  const rubricsText = rubrics
    .map((rubric, index) => heading(rubric, index) + formatRubric(rubric))
    .join('\n\n---\n\n');
  const checklistText = rubrics
    .map((rubric, index) => heading(rubric, index) + renderChecklist(rubric))
    .join('\n\n---\n\n');
  const header = format(JUDGE_PROMPT_MULTI_HEADER, { rubrics: rubricsText, predictions });
  return `${header}\n${checklistText}\n${JUDGE_PROMPT_SCORING_FOOTER}`;
};

/** `_judge_control`'s prompt: the quiet window moved inward by the margin, `null` when open. */
export const buildControlPrompt = (expected: OrcaExpected, predictions: string): string => {
  const { current, quiet_window_start: start, quiet_window_end: end } = expected;
  if (!current) throw new Error('An ORCA control needs expected.current');
  return format(JUDGE_PROMPT_CONTROL, {
    current_time: current,
    quiet_window_start: start ? shiftIsoMinutes(start, CONTROL_QUIET_WINDOW_MARGIN_MIN) : 'null',
    quiet_window_end: end ? shiftIsoMinutes(end, -CONTROL_QUIET_WINDOW_MARGIN_MIN) : 'null',
    predictions,
  });
};

const METRIC_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    metric_family: { type: 'string' },
    family_match: { type: 'boolean' },
  },
  required: ['metric_family', 'family_match'],
  additionalProperties: false,
} as const;

const LOG_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    body_match: { type: 'boolean' },
    service_name_match: { type: 'boolean' },
  },
  required: ['body_match', 'service_name_match'],
  additionalProperties: false,
} as const;

const TRACE_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    call_chain_match: { type: 'boolean' },
    smoking_gun_match: { type: 'boolean' },
  },
  required: ['call_chain_match', 'smoking_gun_match'],
  additionalProperties: false,
} as const;

const PER_RUBRIC_SCHEMA = {
  type: 'object',
  properties: {
    feature_flag: { type: 'string' },
    incident_time_within_10min: { type: 'boolean' },
    feature_flag_match: { type: 'boolean' },
    mechanism_match: { type: 'boolean' },
    symptoms: {
      type: 'object',
      properties: {
        metrics: { type: 'array', items: METRIC_ITEM_SCHEMA },
        logs: { type: 'array', items: LOG_ITEM_SCHEMA },
        traces: { type: 'array', items: TRACE_ITEM_SCHEMA },
      },
      required: ['metrics', 'logs', 'traces'],
      additionalProperties: false,
    },
    score: { type: 'integer' },
  },
  required: [
    'feature_flag',
    'incident_time_within_10min',
    'feature_flag_match',
    'mechanism_match',
    'symptoms',
    'score',
  ],
  additionalProperties: false,
} as const;

/** `build_judge_output_schema(...)`: one verdict per rubric. It does not depend on the rubrics. */
export const JUDGE_OUTPUT_SCHEMA = {
  type: 'object',
  properties: { rubrics: { type: 'array', items: PER_RUBRIC_SCHEMA } },
  required: ['rubrics'],
  additionalProperties: false,
} as const;

// ---------------------------------------------------------------------------
// Parsing + aggregation
// ---------------------------------------------------------------------------

export type OrcaJudgeMode = 'llm_judge' | 'empty_report' | 'no_incident_llm_judge';

/** The judge's answer, or one synthesized in its shape: one verdict per rubric. */
export interface OrcaJudgeResponse {
  rubrics: JsonObject[];
}

/** Python's `int(value)` for the values a judge can return as a score. */
const toInt = (value: JsonValue | undefined): number => {
  if (typeof value === 'boolean') return value ? 1 : 0;
  const number = typeof value === 'string' ? Number(value.trim()) : value;
  if (typeof number !== 'number' || !Number.isFinite(number)) {
    throw new Error(`Per-rubric score ${String(value)} is not an integer`);
  }
  if (typeof value === 'string' && !Number.isInteger(number)) {
    throw new Error(`Per-rubric score ${value} is not an integer`);
  }
  return Math.trunc(number);
};

/**
 * `parse_judge_response`, on the judge's already-decoded answer: range-checks every per-rubric
 * score. Throws on an answer that is not an object with a `rubrics` list.
 */
export const parseJudgeResponse = (parsed: JsonValue): OrcaJudgeResponse => {
  if (!isObject(parsed)) throw new Error('ORCA judge response is not an object');
  const rubrics = asList(get(parsed, 'rubrics', []) || []);
  return {
    rubrics: rubrics.map((verdict) => {
      if (!isObject(verdict)) throw new Error('ORCA judge verdict is not an object');
      const score = toInt(verdict.score);
      if (score < 0 || score > 3) throw new Error(`Per-rubric score ${score} out of range [0, 3]`);
      return { ...verdict, score };
    }),
  };
};

export interface OrcaRubricRollup {
  feature_flag: string;
  incident_time_within_10min: boolean;
  feature_flag_match: boolean;
  mechanism_match: boolean;
  metrics_all_match: boolean | null;
  metrics_any_match: boolean | null;
  logs_all_match: boolean | null;
  logs_any_match: boolean | null;
  traces_all_match: boolean | null;
  traces_any_match: boolean | null;
  score: number;
}

export interface OrcaAggregate {
  incident_time_within_10min: boolean;
  hallucinate_any: boolean | null;
  rca_accuracy: boolean | null;
  mechanism_match: boolean;
  metrics_all_match: boolean | null;
  metrics_any_match: boolean | null;
  logs_all_match: boolean | null;
  logs_any_match: boolean | null;
  traces_all_match: boolean | null;
  traces_any_match: boolean | null;
  per_rubric: OrcaRubricRollup[];
  per_rubric_scores: number[];
  rca_depth: number | null;
}

const all = (hits: boolean[]): boolean | null => (hits.length > 0 ? hits.every(Boolean) : null);
const any = (hits: boolean[]): boolean | null => (hits.length > 0 ? hits.some(Boolean) : null);
const defined = (values: Array<boolean | null>): boolean[] =>
  values.filter((value): value is boolean => value !== null);

const aggregateOneRubric = (verdict: JsonObject): OrcaRubricRollup => {
  const symptoms = get(verdict, 'symptoms', {}) || {};
  const metricHits = getList(symptoms, 'metrics').map((metric) =>
    Boolean(get(metric, 'family_match'))
  );
  const logHits = getList(symptoms, 'logs').map(
    (log) => Boolean(get(log, 'body_match')) && Boolean(get(log, 'service_name_match'))
  );
  const traceHits = getList(symptoms, 'traces').map(
    (trace) => Boolean(get(trace, 'call_chain_match')) && Boolean(get(trace, 'smoking_gun_match'))
  );
  return {
    feature_flag: str(get(verdict, 'feature_flag', '')),
    incident_time_within_10min: Boolean(get(verdict, 'incident_time_within_10min')),
    feature_flag_match: Boolean(get(verdict, 'feature_flag_match')),
    mechanism_match: Boolean(get(verdict, 'mechanism_match')),
    metrics_all_match: all(metricHits),
    metrics_any_match: any(metricHits),
    logs_all_match: all(logHits),
    logs_any_match: any(logHits),
    traces_all_match: all(traceHits),
    traces_any_match: any(traceHits),
    score: toInt(verdict.score),
  };
};

/**
 * `aggregate_judge_response(parsed, mode=mode)`. `rca_accuracy` needs every rubric's flag
 * (the prompt says "any one", the code and the paper's numbers say all), `hallucinate_any` is a
 * non-empty report that matched no rubric's flag, and `rca_depth` is the mean per-rubric score.
 */
export const aggregateJudgeResponse = (
  parsed: OrcaJudgeResponse,
  mode?: OrcaJudgeMode
): OrcaAggregate => {
  const perRubric = (parsed.rubrics ?? []).map(aggregateOneRubric);
  const anySkipNull = (values: Array<boolean | null>): boolean | null => any(defined(values));
  const allSkipNull = (values: Array<boolean | null>): boolean | null => all(defined(values));
  const pick = <K extends keyof OrcaRubricRollup>(key: K) => perRubric.map((each) => each[key]);

  const scores = perRubric.map(({ score }) => score);
  const rcaDepth =
    scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
  const isNoIncident = perRubric.length === 1 && perRubric[0].feature_flag === '(no_incident)';
  const flagAnyMatch = anySkipNull(pick('feature_flag_match')) || false;
  const hallucinateAny = isNoIncident ? null : mode === 'empty_report' ? false : !flagAnyMatch;

  return {
    incident_time_within_10min: anySkipNull(pick('incident_time_within_10min')) || false,
    hallucinate_any: hallucinateAny,
    rca_accuracy: allSkipNull(pick('feature_flag_match')),
    mechanism_match: anySkipNull(pick('mechanism_match')) || false,
    metrics_all_match: anySkipNull(pick('metrics_all_match')),
    metrics_any_match: anySkipNull(pick('metrics_any_match')),
    logs_all_match: anySkipNull(pick('logs_all_match')),
    logs_any_match: anySkipNull(pick('logs_any_match')),
    traces_all_match: anySkipNull(pick('traces_all_match')),
    traces_any_match: anySkipNull(pick('traces_any_match')),
    per_rubric: perRubric,
    per_rubric_scores: scores,
    rca_depth: rcaDepth,
  };
};

/** `reward = (rca_depth or 0) / 3`, the trial's headline score. */
export const orcaReward = ({ rca_depth: rcaDepth }: OrcaAggregate): number => (rcaDepth || 0) / 3;

/** `build_rewards(agg, reward)`: Harbor's flat reward file, leaving out undefined rollups. */
export const buildRewards = (aggregate: OrcaAggregate, reward: number): Record<string, number> => ({
  reward,
  ...(aggregate.rca_accuracy === null ? {} : { rca_accuracy: Number(aggregate.rca_accuracy) }),
  ...(aggregate.hallucinate_any === null
    ? {}
    : { hallucinate_any: Number(aggregate.hallucinate_any) }),
});

/** A per-rubric verdict with every match false, as the verifier synthesizes for short-circuits. */
export const synthRubricVerdict = (featureFlag: string, score: number): JsonObject => ({
  feature_flag: featureFlag,
  incident_time_within_10min: false,
  feature_flag_match: false,
  mechanism_match: false,
  symptoms: { metrics: [], logs: [], traces: [] },
  score,
});

/** What `judge` records for an empty incident report: no LLM call, every rubric 0. */
export const emptyReportResponse = (rubrics: readonly OrcaRubric[]): OrcaJudgeResponse => ({
  rubrics: rubrics.map((rubric) => {
    const symptoms = get(rubric, 'symptoms', {}) || {};
    return {
      feature_flag: str(get(rubric, 'feature_flag', '')),
      incident_time_within_10min: false,
      feature_flag_match: false,
      mechanism_match: false,
      symptoms: {
        metrics: getList(symptoms, 'metrics').map((metric) => ({
          metric_family: str(get(metric, 'metric_family', '')),
          family_match: false,
        })),
        logs: getList(symptoms, 'logs').map(() => ({
          body_match: false,
          service_name_match: false,
        })),
        traces: getList(symptoms, 'traces').map(() => ({
          call_chain_match: false,
          smoking_gun_match: false,
        })),
      },
      score: 0,
    };
  }),
});

/** A control's verdict: score 3 for a pass (an empty report, or no incident in the window). */
export const controlResponse = (claimsIncidentInQuietWindow: boolean): OrcaJudgeResponse => ({
  rubrics: [synthRubricVerdict('(no_incident)', claimsIncidentInQuietWindow ? 0 : 3)],
});

/** `not predictions.strip()`. */
export const isEmptyReport = (predictions: string): boolean => strip(predictions) === '';
