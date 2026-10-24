/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import type { EvalConnector } from '@kbn/evals';
import { ToolingLog } from '@kbn/tooling-log';
import type { InvestigationTaskOutput } from '../types';
import { NO_CONCLUSION_ERROR } from '../task';
import {
  createAntiLeakageEvaluator,
  createGoalPassEvaluator,
  createOrcaEvaluators,
  createTruthfulnessEvaluator,
  ORCA_CONTROL_EVALUATOR,
  ORCA_HALLUCINATION_EVALUATOR,
  ORCA_RCA_ACCURACY_EVALUATOR,
} from '.';
import { normalizeGoalScore, normalizeTruthfulnessScore } from './scoring';

jest.mock('@kbn/inference-tracing', () => ({
  ElasticGenAIAttributes: { InferenceSpanKind: 'elastic.inference.span.kind' },
  withActiveInferenceSpan: (_name: string, _options: object, callback: () => Promise<object>) =>
    callback(),
}));

const judgeReturning = (args: Record<string, string | number | boolean | string[]>) => {
  const prompt = jest.fn().mockResolvedValue({ toolCalls: [{ function: { arguments: args } }] });
  return {
    prompt,
    deps: {
      inferenceClient: { prompt } as unknown as BoundInferenceClient,
      evaluationConnector: { id: 'judge' } as EvalConnector,
      log: new ToolingLog(),
    },
  };
};

const example = {
  input: { question: 'Why did checkout fail?' },
  expected: { reference_answer: 'A bad deploy broke checkout.' },
  metadata: { case_id: 'checkout' },
};

const output = (overrides: Partial<InvestigationTaskOutput> = {}): InvestigationTaskOutput => ({
  case_id: 'checkout',
  query: example.input.question,
  structured_report: {
    summary: 'Checkout errors rose after a deploy.',
    hypotheses: [{ candidate: 'Bad deploy', confidence: 0.8, status: 'investigating' }],
  },
  tool_call_trajectory: [{ tool_id: 'bash', params: { command: 'curl' }, result: 'errors' }],
  ...overrides,
});

describe('goal_pass', () => {
  it('grades a run without a verdict on its hypotheses and labels it no_verdict', async () => {
    const { deps, prompt } = judgeReturning({ score: 4, summary: 'Close.' });
    const result = await createGoalPassEvaluator(deps).evaluate({
      ...example,
      output: output({ execution_error: NO_CONCLUSION_ERROR }),
    });
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      score: normalizeGoalScore(4),
      label: 'pass',
      explanation: expect.stringMatching(/^No verdict was recorded/),
      metadata: { no_verdict: true },
    });
  });

  it('fails any other execution error without calling the judge', async () => {
    const { deps, prompt } = judgeReturning({ score: 5, summary: 'Unused.' });
    const result = await createGoalPassEvaluator(deps).evaluate({
      ...example,
      output: output({ execution_error: 'Investigation was still in progress after 30 minutes' }),
    });
    expect(prompt).not.toHaveBeenCalled();
    expect(result).toMatchObject({ score: 0, label: 'fail' });
  });
});

describe('truthfulness', () => {
  it('labels a run without a verdict no_verdict', async () => {
    const { deps } = judgeReturning({
      score: 3,
      did_real_work: true,
      evidence_source: 'tools',
      summary: 'Grounded.',
    });
    const result = await createTruthfulnessEvaluator(deps).evaluate({
      ...example,
      output: output({ execution_error: NO_CONCLUSION_ERROR }),
    });
    expect(result).toMatchObject({
      score: normalizeTruthfulnessScore(3),
      metadata: { no_verdict: true },
    });
  });

  it('is n/a without a trajectory', async () => {
    const { deps, prompt } = judgeReturning({});
    const result = await createTruthfulnessEvaluator(deps).evaluate({
      ...example,
      output: output({ tool_call_trajectory: undefined }),
    });
    expect(prompt).not.toHaveBeenCalled();
    expect(result).toMatchObject({ score: null, label: 'n/a' });
  });

  it('fails any other execution error without calling the judge', async () => {
    const { deps, prompt } = judgeReturning({});
    const result = await createTruthfulnessEvaluator(deps).evaluate({
      ...example,
      output: output({ execution_error: 'Service unavailable' }),
    });
    expect(prompt).not.toHaveBeenCalled();
    expect(result).toMatchObject({ score: 0, label: 'fail' });
  });
});

describe('rca_anti_leakage', () => {
  it('is n/a without a trajectory', async () => {
    const { deps, prompt } = judgeReturning({});
    const result = await createAntiLeakageEvaluator(deps).evaluate({
      ...example,
      output: output({ tool_call_trajectory: undefined }),
    });
    expect(prompt).not.toHaveBeenCalled();
    expect(result).toMatchObject({ score: null, label: 'n/a' });
  });
});

describe('ORCA scores', () => {
  const evaluator = (deps: ReturnType<typeof judgeReturning>['deps'], name: string) => {
    const found = createOrcaEvaluators(deps).find((candidate) => candidate.name === name);
    if (!found) throw new Error(`missing ${name}`);
    return found;
  };

  it('scores accuracy 0 when the report names only one of several plausible flags', async () => {
    const { deps, prompt } = judgeReturning({
      named_flags: ['productCatalogFailure'],
      named_causes: ['productCatalogFailure'],
      reasoning: 'One flag.',
    });
    const result = await evaluator(deps, ORCA_RCA_ACCURACY_EVALUATOR).evaluate({
      ...example,
      metadata: {
        case_id: 'checkout',
        plausible_flags: ['productCatalogFailure', 'recommendationCacheFailure'],
      },
      output: output(),
    });
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ score: 0, label: 'fail' });
  });

  it('passes an empty control report without calling the judge', async () => {
    const { deps, prompt } = judgeReturning({
      incident_inside_quiet_window: true,
      reasoning: 'Unused.',
    });
    const result = await evaluator(deps, ORCA_CONTROL_EVALUATOR).evaluate({
      ...example,
      metadata: { case_id: 'checkout', control: true, plausible_flags: [] },
      output: output({ structured_report: undefined }),
    });
    expect(prompt).not.toHaveBeenCalled();
    expect(result).toMatchObject({ score: 1, label: 'pass' });
  });

  it('passes a control report that only has the default severity', async () => {
    const { deps, prompt } = judgeReturning({
      incident_inside_quiet_window: true,
      reasoning: 'Unused.',
    });
    const result = await evaluator(deps, ORCA_CONTROL_EVALUATOR).evaluate({
      ...example,
      metadata: { case_id: 'checkout', control: true },
      output: output({ structured_report: { severity: 'medium' } }),
    });
    expect(prompt).not.toHaveBeenCalled();
    expect(result).toMatchObject({ score: 1, label: 'pass' });
  });

  it('fails a control report that places an incident inside the quiet window', async () => {
    const { deps } = judgeReturning({
      incident_inside_quiet_window: true,
      reasoning: 'The report puts the incident inside the window.',
    });
    const result = await evaluator(deps, ORCA_CONTROL_EVALUATOR).evaluate({
      ...example,
      metadata: {
        case_id: 'checkout',
        task_type: 'control',
        plausible_flags: [],
        quiet_window: { start: '2026-04-19T16:00:00.000Z', end: '2026-04-19T17:00:00.000Z' },
      },
      output: output(),
    });
    expect(result).toMatchObject({ score: 0, label: 'fail' });
  });

  it('scores a hallucination when a named cause is outside the plausible set', async () => {
    const { deps } = judgeReturning({
      named_flags: ['productCatalogFailure'],
      named_causes: ['productCatalogFailure', 'paymentServiceMemoryLeak'],
      reasoning: 'An extra cause.',
    });
    const result = await evaluator(deps, ORCA_HALLUCINATION_EVALUATOR).evaluate({
      ...example,
      metadata: { case_id: 'checkout', plausible_flags: ['productCatalogFailure'] },
      output: output(),
    });
    expect(result).toMatchObject({ score: 1, label: 'hallucinated' });
  });
});
