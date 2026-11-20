/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { JsonValue, OrcaAggregate, OrcaExpected, OrcaJudgeMode } from './check_prediction';
import {
  aggregateJudgeResponse,
  buildControlPrompt,
  buildJudgePrompt,
  buildRewards,
  CONTROL_OUTPUT_SCHEMA,
  controlResponse,
  emptyReportResponse,
  isEmptyReport,
  JUDGE_OUTPUT_SCHEMA,
  orcaReward,
  parseJudgeResponse,
  shiftIsoMinutes,
  tabulateGithub,
} from './check_prediction';
import type { OrcaJudgeResponse, OrcaRubric } from './check_prediction';
import { getOrcaRubrics, getOrcaRubricsHash, ORCA_RUBRICS_RELEASE } from './rubrics';

/**
 * What `__fixtures__/generate_parity_fixtures.py` recorded from ORCA's own `check_prediction.py`.
 * The committed fixture renders hand-written rubrics; `ORCA_PARITY_FIXTURES` points the same test
 * at a fixture generated from ORCA's real rubrics, kept outside the repo.
 */
interface ParityFixtures {
  report: string;
  rubrics: Record<string, OrcaRubric>;
  incident_schema: JsonValue;
  control_schema: JsonValue;
  incident: Array<{
    event_ids: string[];
    sha256: string;
    prompt?: string;
    empty_report: OrcaJudgeResponse;
  }>;
  control: Array<{ expected: OrcaExpected; prompt: string }>;
  /** `judge`'s control verdicts: no incident in the window, one claimed there, an empty report. */
  control_verdicts: Record<'clear' | 'claims' | 'empty', OrcaJudgeResponse>;
  aggregates: Array<{
    mode: OrcaJudgeMode;
    nested: { rubrics: Array<Record<string, JsonValue>> };
    aggregate: OrcaAggregate;
    rewards: Record<string, number>;
  }>;
}

const realRubricsFixture = process.env.ORCA_PARITY_FIXTURES;
const fixtures: ParityFixtures = JSON.parse(
  readFileSync(realRubricsFixture ?? join(__dirname, '__fixtures__', 'parity.json'), 'utf8')
);
const rubricsById = new Map(Object.entries(fixtures.rubrics));

const sha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');

const rubricsFor = (eventIds: string[]) => {
  // Shuffled, so the port's own ordering is what puts the rubrics in the verifier's order.
  const events = [...eventIds]
    .reverse()
    .map((eventId) => ({ event_id: eventId, root_cause: '', event_time: '' }));
  const result = getOrcaRubrics({ events }, rubricsById);
  if (!('rubrics' in result)) throw new Error(`Missing rubrics ${result.missing.join(', ')}`);
  return result.rubrics;
};

describe('ORCA check_prediction port', () => {
  it('renders the judge prompt byte for byte for every rubric set', () => {
    expect(fixtures.incident.length).toBeGreaterThan(0);
    for (const { event_ids: eventIds, sha256: expected, prompt } of fixtures.incident) {
      const rendered = buildJudgePrompt(rubricsFor(eventIds), fixtures.report);
      if (prompt !== undefined) expect(rendered).toBe(prompt);
      expect({ eventIds, sha256: sha256(rendered) }).toEqual({ eventIds, sha256: expected });
    }
  });

  it('reports the event ids that have no rubric', () => {
    expect(
      getOrcaRubrics(
        { events: [{ event_id: 'missing', root_cause: '', event_time: '' }] },
        rubricsById
      )
    ).toEqual({ missing: ['missing'] });
  });

  // Ties the pinned Golden release to the rubrics parity was checked on: bump the pin with this run.
  (realRubricsFixture ? it : it.skip)('was checked on the pinned rubric release', () => {
    expect(getOrcaRubricsHash(rubricsById)).toBe(ORCA_RUBRICS_RELEASE.sha256);
  });

  it('synthesizes the empty-report and control verdicts as the verifier does', () => {
    for (const { event_ids: eventIds, empty_report: expected } of fixtures.incident) {
      expect(emptyReportResponse(rubricsFor(eventIds))).toEqual(expected);
    }
    const { clear, claims, empty } = fixtures.control_verdicts;
    expect(controlResponse(false)).toEqual(clear);
    expect(controlResponse(true)).toEqual(claims);
    expect(controlResponse(false)).toEqual(empty);
  });

  it('renders the control prompt byte for byte', () => {
    for (const { expected, prompt } of fixtures.control) {
      expect(buildControlPrompt(expected, fixtures.report)).toBe(prompt);
    }
  });

  it('keeps the output schemas, key order included', () => {
    expect(JSON.stringify(JUDGE_OUTPUT_SCHEMA)).toBe(JSON.stringify(fixtures.incident_schema));
    expect(JSON.stringify(CONTROL_OUTPUT_SCHEMA)).toBe(JSON.stringify(fixtures.control_schema));
  });

  it('aggregates verdicts as the verifier does', () => {
    for (const { mode, nested, aggregate, rewards } of fixtures.aggregates) {
      const result = aggregateJudgeResponse(parseJudgeResponse(nested), mode);
      expect(result).toEqual(aggregate);
      expect(buildRewards(result, orcaReward(result))).toEqual(rewards);
    }
  });

  it('scores an empty incident report 0 on every rubric without hallucination', () => {
    const rubrics = rubricsFor(fixtures.incident[0].event_ids);
    const result = aggregateJudgeResponse(emptyReportResponse(rubrics), 'empty_report');
    expect(result.per_rubric_scores).toEqual(rubrics.map(() => 0));
    expect(result).toMatchObject({ rca_accuracy: false, hallucinate_any: false, rca_depth: 0 });
  });

  it('rejects an out-of-range or missing score', () => {
    expect(() => parseJudgeResponse({ rubrics: [{ score: 4 }] })).toThrow('out of range');
    expect(() => parseJudgeResponse({ rubrics: [{}] })).toThrow('not an integer');
    expect(() => parseJudgeResponse({ rubrics: { score: 3 } })).toThrow('not a list');
    expect(parseJudgeResponse({ rubrics: null }).rubrics).toEqual([]);
    expect(parseJudgeResponse({ rubrics: [{ score: 2.7 }] }).rubrics[0].score).toBe(2);
  });

  it('reads a string score as int() does', () => {
    const score = (value: string) => parseJudgeResponse({ rubrics: [{ score: value }] }).rubrics[0];
    // int() raises on these, so the judge call retries rather than recording a score.
    // U+001C-U+001F are str.strip() whitespace, but int() rejects them.
    for (const rejected of ['', ' ', '3.0', '0x3', '3e0', '1__0', '_1', '3_', '\x1c3', '3\x1f']) {
      expect(() => score(rejected)).toThrow('not an integer');
    }
    expect([' 3 ', '+3', '0_3', '-0', '\x853\u3000'].map((value) => score(value).score)).toEqual([
      3, 3, 3, 0, 3,
    ]);
    expect(() => score('1_0')).toThrow('out of range');
  });

  it("treats a whitespace-only report as empty, with str.strip()'s whitespace", () => {
    expect(isEmptyReport(' \n\t')).toBe(true);
    expect(isEmptyReport('\x85\x1c\u3000')).toBe(true);
    expect(isEmptyReport('\ufeff')).toBe(false);
    expect(isEmptyReport('\u200b')).toBe(false);
    expect(isEmptyReport('x')).toBe(false);
  });

  it('throws on an empty quiet-window bound, as the verifier does', () => {
    const control = { events: [], current: '2026-04-20T01:00:00Z' };
    expect(() => buildControlPrompt({ ...control, quiet_window_start: '' }, 'x')).toThrow(
      'Not an ISO 8601 time'
    );
    expect(buildControlPrompt({ ...control, quiet_window_end: null }, 'x')).toContain(
      'quiet_window_end   = null'
    );
  });

  it('shifts times as datetime.isoformat prints them', () => {
    expect(shiftIsoMinutes('2026-04-21T22:46:44.092046+00:00', 10)).toBe(
      '2026-04-21T22:56:44.092046+00:00'
    );
    expect(shiftIsoMinutes('2026-04-19T23:59:00.000000+00:00', 10)).toBe(
      '2026-04-20T00:09:00+00:00'
    );
    expect(shiftIsoMinutes('2026-04-22T09:05:00Z', -10)).toBe('2026-04-22T08:55:00+00:00');
    expect(shiftIsoMinutes('2026-04-22T09:05:00.5-04:00', -10)).toBe(
      '2026-04-22T08:55:00.500000-04:00'
    );
  });

  it('pads multi-line cells as tabulate does', () => {
    expect(tabulateGithub([['`a`', '`one\ntwo lines`']], ['Field', 'Value'])).toBe(
      [
        '| Field   | Value      |',
        '|---------|------------|',
        '| `a`     | `one       |',
        '|         | two lines` |',
      ].join('\n')
    );
  });
});
