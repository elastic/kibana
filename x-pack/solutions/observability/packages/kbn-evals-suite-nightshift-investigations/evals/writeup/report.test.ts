/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasetRunResult } from '@kbn/evals';
import { judgeAgreement, pearson } from './judge_agreement';
import { formatReport, ratchetCandidates, toWriteupRows, type WriteupResults } from './report';
import {
  REPLY_FAITHFULNESS_EVALUATOR,
  REPLY_VS_BASELINE_EVALUATOR,
  REPLY_VS_GOLDEN_EVALUATOR,
} from './evaluators';

type TaskRun = DatasetRunResult['runs'][string];
type EvaluationRun = DatasetRunResult['evaluationRuns'][number];

const SHORT = 'No. Checkout never charged anyone during the incident window today.';
const LONG = `**Answer:** ${'Checkout failed in many ways that we looked at for a long time. '.repeat(
  12
)}`;

const taskRun = (caseId: string, reply: string | undefined, repetition = 0): TaskRun => ({
  exampleIndex: 0,
  repetition,
  input: {
    rounds: [{ input: { message: 'Were customers charged?' }, steps: [] }],
    round_index: 1,
  },
  expected: { recorded_reply: LONG, golden: 'Nobody was charged during the incident window.' },
  metadata: { case_id: caseId },
  output: {
    case_id: caseId,
    round_index: 1,
    question: 'Were customers charged?',
    recorded_reply: LONG,
    replay_chars: 10,
    prompt_hash: 'h1',
    extra_calls: [],
    ...(reply ? { reply } : { error: 'empty reply' }),
    baseline: { reply: LONG, extra_calls: [], prompt_hash: 'h0' },
  },
});

const evaluation = (
  runId: string,
  name: string,
  metadata: Record<string, unknown>
): EvaluationRun => ({
  name,
  experimentRunId: runId,
  direction: 'maximize',
  result: { score: 1, metadata },
});

const results = (
  judge: string,
  faith: number,
  vsBaseline: Record<string, number>
): WriteupResults => ({
  dataset: 'nightshift/x',
  model: 'sonnet',
  judge,
  prompt: { label: 'current', hash: 'h1' },
  baseline: { label: 'main', hash: 'h0' },
  votes: 2,
  rows: toWriteupRows({ a: taskRun('case/r2', SHORT), b: taskRun('other/r2', undefined) }, [
    evaluation('a', REPLY_FAITHFULNESS_EVALUATOR, { raw_score: faith, unsupported_claims: [] }),
    evaluation('a', REPLY_VS_GOLDEN_EVALUATOR, { win: 4, loss: 0, tie: 0, failed: 0 }),
    evaluation('a', REPLY_VS_BASELINE_EVALUATOR, { failed: 0, tie: 0, ...vsBaseline }),
  ]),
});

describe('toWriteupRows and formatReport', () => {
  const run = results('opus', 5, { win: 4, loss: 0 });

  it('reads each run’s gates and judge results, and gates the recorded and baseline replies', () => {
    const [ok, failed] = run.rows;
    expect(ok).toMatchObject({
      case_id: 'case/r2',
      reply: SHORT,
      faith: 5,
      vs_golden: { win: 4 },
      vs_baseline: { win: 4 },
      gates: { pass: true },
    });
    expect(ok.recorded.gates.pass).toBe(false);
    expect(ok.baseline?.gates?.pass).toBe(false);
    expect(failed).toMatchObject({ reply: null, error: 'empty reply', gates: null, faith: null });
  });

  it('lists a candidate for the ratchet only when it clears every bar', () => {
    expect(ratchetCandidates(run.rows, 2).map((r) => r.case_id)).toEqual(['case/r2']);
    expect(ratchetCandidates(run.rows, 3)).toEqual([]);
  });

  it('summarizes every arm in one table', () => {
    const { summary, report } = formatReport(run);
    expect(summary).toContain('| current | 1/2 | 1/1 |');
    expect(summary).toContain('| main | 2/2 | 0/2 |');
    expect(summary).toContain('| recorded | 2/2 | 0/2 |');
    expect(summary).toContain('current vs main, head to head: 4 wins, 0 losses, 0 ties.');
    expect(report).toContain('- case/r2, sample 0');
  });
});

describe('judgeAgreement', () => {
  it('compares judges on identical replies', () => {
    const out = judgeAgreement([
      results('opus', 5, { win: 4, loss: 0 }),
      results('gpt', 4, { win: 0, loss: 4 }),
    ]);
    expect(out).toContain('Reference judge: opus. Others: gpt. 2 round samples compared.');
    expect(out).toContain('| vs baseline | 4–0–0 | 0–4–0 |');
    expect(out).toContain(
      '- gpt: agrees on 1 of 2 decided comparisons (50%), opposite winner on 1.'
    );
    expect(out).toContain('- opus: the shorter reply won 1 of 2 (50%).');
  });

  it('drops rounds whose replies differ between runs', () => {
    const other = results('gpt', 4, { win: 4, loss: 0 });
    other.rows[0] = { ...other.rows[0], reply: 'A different reply entirely.' };
    expect(judgeAgreement([results('opus', 5, { win: 4, loss: 0 }), other])).toContain(
      'dropped case/r2#0'
    );
  });

  it('needs two runs', () => {
    expect(() => judgeAgreement([results('opus', 5, { win: 1, loss: 0 })])).toThrow('at least two');
  });
});

describe('pearson', () => {
  it('is 1 for a perfect linear relation', () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
  });
});
