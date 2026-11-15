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
  emptyReportResponse,
  isEmptyReport,
  JUDGE_OUTPUT_SCHEMA,
  orcaReward,
  parseJudgeResponse,
  shiftIsoMinutes,
  tabulateGithub,
} from './check_prediction';
import type { OrcaRubric } from './check_prediction';
import { getOrcaRubrics } from './rubrics';

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
  incident: Array<{ event_ids: string[]; sha256: string; prompt?: string }>;
  control: Array<{ expected: OrcaExpected; prompt: string }>;
  aggregates: Array<{
    mode: OrcaJudgeMode;
    nested: { rubrics: Array<Record<string, JsonValue>> };
    aggregate: OrcaAggregate;
    rewards: Record<string, number>;
  }>;
}

const fixtures: ParityFixtures = JSON.parse(
  readFileSync(
    process.env.ORCA_PARITY_FIXTURES ?? join(__dirname, '__fixtures__', 'parity.json'),
    'utf8'
  )
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

  it('treats a whitespace-only report as empty', () => {
    expect(isEmptyReport(' \n\t')).toBe(true);
    expect(isEmptyReport('x')).toBe(false);
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
