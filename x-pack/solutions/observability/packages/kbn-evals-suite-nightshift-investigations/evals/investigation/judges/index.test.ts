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
import { OrcaControlJudgePrompt, OrcaFlagsJudgePrompt } from './prompts';
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

  it('scores accuracy and hallucination from one judge call for a run', async () => {
    const { deps, prompt } = judgeReturning({
      named_flags: ['productCatalogFailure'],
      named_causes: ['productCatalogFailure'],
      reasoning: 'One flag.',
    });
    const evaluators = createOrcaEvaluators(deps);
    const metadata = { case_id: 'checkout', plausible_flags: ['productCatalogFailure'] };
    const taskOutput = output();
    const score = (name: string) => {
      const found = evaluators.find((candidate) => candidate.name === name);
      // The runner spreads a new output object for each evaluator.
      return found?.evaluate({ ...example, metadata, output: { ...taskOutput, traceId: 'trace' } });
    };

    const [accuracy, hallucination] = await Promise.all([
      score(ORCA_RCA_ACCURACY_EVALUATOR),
      score(ORCA_HALLUCINATION_EVALUATOR),
    ]);

    expect(prompt).toHaveBeenCalledTimes(1);
    expect(accuracy).toMatchObject({ score: 1, label: 'pass' });
    expect(hallucination).toMatchObject({ score: 0, label: 'pass' });
  });

  it('judges each run separately', async () => {
    const { deps, prompt } = judgeReturning({
      named_flags: [],
      named_causes: [],
      reasoning: 'None.',
    });
    const accuracy = evaluator(deps, ORCA_RCA_ACCURACY_EVALUATOR);
    const metadata = { case_id: 'checkout', plausible_flags: ['productCatalogFailure'] };

    await accuracy.evaluate({ ...example, metadata, output: output() });
    await accuracy.evaluate({ ...example, metadata, output: output() });

    expect(prompt).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['control', OrcaControlJudgePrompt],
    ['flags', OrcaFlagsJudgePrompt],
  ])('asks the %s judge for its reasoning before its decision', (_, prompt) => {
    const [version] = prompt.versions;
    const { properties, required } = version.tools?.score.schema as {
      properties: Record<string, unknown>;
      required: string[];
    };
    expect(Object.keys(properties)[0]).toBe('reasoning');
    expect(required[0]).toBe('reasoning');
  });

  it('accepts a report and reference longer than any fixed limit', () => {
    const long = 'x'.repeat(100_000);
    expect(() =>
      OrcaFlagsJudgePrompt.input.parse({ plausibleFlags: 'a', reference: long, answer: long })
    ).not.toThrow();
    expect(() =>
      OrcaControlJudgePrompt.input.parse({
        currentTime: '2026-04-19T09:00:00-04:00',
        quietWindowStart: 'null',
        quietWindowEnd: '2026-04-19T14:01:51.404Z',
        answer: long,
      })
    ).not.toThrow();
  });

  it('passes an empty control report without calling the judge', async () => {
    const { deps, prompt } = judgeReturning({
      claims_incident_in_quiet_window: true,
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
      claims_incident_in_quiet_window: true,
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
      claims_incident_in_quiet_window: true,
      reasoning: 'The report puts the incident inside the window.',
    });
    const result = await evaluator(deps, ORCA_CONTROL_EVALUATOR).evaluate({
      ...example,
      metadata: {
        case_id: 'checkout',
        task_type: 'control',
        plausible_flags: [],
        current_time: '2026-04-19T16:30:00.000Z',
        quiet_window: { start: '2026-04-19T16:00:00.000Z', end: '2026-04-19T17:00:00.000Z' },
      },
      output: output(),
    });
    expect(result).toMatchObject({ score: 0, label: 'fail' });
  });

  it('gives the control judge the current time and the quiet window ORCA shows it', async () => {
    const { deps, prompt } = judgeReturning({
      claims_incident_in_quiet_window: false,
      reasoning: 'Only a past incident.',
    });
    const result = await evaluator(deps, ORCA_CONTROL_EVALUATOR).evaluate({
      ...example,
      metadata: {
        case_id: 'checkout',
        no_incident: true,
        current_time: '2026-04-19T09:00:00-04:00',
        quiet_window: { start: null, end: '2026-04-19T14:01:51.404Z' },
      },
      output: output(),
    });
    expect(prompt).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: OrcaControlJudgePrompt,
        input: expect.objectContaining({
          currentTime: '2026-04-19T09:00:00-04:00',
          // An open-ended bound is null; a defined one moves ten minutes inward.
          quietWindowStart: 'null',
          quietWindowEnd: '2026-04-19T13:51:51.404Z',
        }),
      })
    );
    expect(result).toMatchObject({ score: 1, label: 'pass' });
  });

  it('shows the control judge the whole report, including impact and evidence', async () => {
    const { deps, prompt } = judgeReturning({
      claims_incident_in_quiet_window: true,
      reasoning: 'The impact summary says users are affected now.',
    });
    const structuredReport = {
      conclusion: 'A past checkout incident was resolved.',
      hypotheses: [
        {
          candidate: 'Bad deploy',
          confidence: 0.6,
          status: 'confirmed',
          evidence: [{ description: 'Error rate still at 12% at 16:40' }],
        },
      ],
      impact: { summary: 'Checkout is failing for users right now.' },
    } as unknown as InvestigationTaskOutput['structured_report'];

    await evaluator(deps, ORCA_CONTROL_EVALUATOR).evaluate({
      ...example,
      metadata: {
        case_id: 'checkout',
        control: true,
        current_time: '2026-04-19T16:45:00.000Z',
        quiet_window: { start: '2026-04-19T16:00:00.000Z', end: '2026-04-19T17:00:00.000Z' },
      },
      output: output({ structured_report: structuredReport }),
    });

    const { answer } = prompt.mock.calls[0][0].input;
    expect(answer).toContain('A past checkout incident was resolved.');
    expect(answer).toContain('Error rate still at 12% at 16:40');
    expect(answer).toContain('impact: Checkout is failing for users right now.');
  });

  it('does not score a hallucination when a true flag is named alongside an extra cause', async () => {
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
    expect(result).toMatchObject({ score: 0, label: 'pass' });
  });

  it('scores a hallucination when no named cause is in the plausible set', async () => {
    const { deps } = judgeReturning({
      named_flags: [],
      named_causes: ['paymentServiceMemoryLeak'],
      reasoning: 'No plausible flag.',
    });
    const result = await evaluator(deps, ORCA_HALLUCINATION_EVALUATOR).evaluate({
      ...example,
      metadata: { case_id: 'checkout', plausible_flags: ['productCatalogFailure'] },
      output: output(),
    });
    expect(result).toMatchObject({ score: 1, label: 'hallucinated' });
  });

  it('does not score a hallucination when only named_flags holds the true flag', async () => {
    const { deps } = judgeReturning({
      named_flags: ['productCatalogFailure'],
      named_causes: ['The productCatalogFailure flag'],
      reasoning: 'The report words the flag its own way.',
    });
    const result = await evaluator(deps, ORCA_HALLUCINATION_EVALUATOR).evaluate({
      ...example,
      metadata: { case_id: 'checkout', plausible_flags: ['productCatalogFailure'] },
      output: output(),
    });
    expect(result).toMatchObject({ score: 0, label: 'pass' });
  });

  it('keeps accuracy and hallucination n/a for a no-incident control with an empty flag set', async () => {
    const { deps, prompt } = judgeReturning({
      named_flags: ['cartFailure'],
      named_causes: ['cartFailure'],
      claims_incident_in_quiet_window: true,
      reasoning: 'Unused for the set scores.',
    });
    const metadata = { case_id: 'checkout', no_incident: true, plausible_flags: [] as string[] };
    const input = { ...example, metadata, output: output() };
    const accuracy = await evaluator(deps, ORCA_RCA_ACCURACY_EVALUATOR).evaluate(input);
    const hallucination = await evaluator(deps, ORCA_HALLUCINATION_EVALUATOR).evaluate(input);
    const control = await evaluator(deps, ORCA_CONTROL_EVALUATOR).evaluate({
      ...input,
      output: output({ structured_report: undefined }),
    });
    expect(accuracy).toMatchObject({ score: null, label: 'n/a' });
    expect(hallucination).toMatchObject({ score: null, label: 'n/a' });
    expect(control).toMatchObject({ score: 1, label: 'pass' });
    expect(prompt).not.toHaveBeenCalled();
  });

  it.each([
    ['a crash', { execution_error: 'Service unavailable' }],
    [
      'a timeout with partial hypotheses',
      { execution_error: 'Investigation was still in progress after 30 minutes' },
    ],
    [
      'a run that ended with nothing recorded',
      { execution_error: NO_CONCLUSION_ERROR, structured_report: undefined },
    ],
    [
      'a report too large to keep its hypotheses',
      {
        report_truncated: true,
        structured_report: { summary: 'Kept.', conclusion: 'Kept.' },
      },
    ],
  ])('leaves every ORCA score unscored after %s', async (_, overrides) => {
    const { deps, prompt } = judgeReturning({
      named_flags: [],
      named_causes: [],
      claims_incident_in_quiet_window: false,
      reasoning: 'Unused.',
    });
    const incident = { case_id: 'checkout', plausible_flags: ['productCatalogFailure'] };
    const control = { case_id: 'checkout', control: true };
    const failed = output(overrides);
    const results = await Promise.all([
      evaluator(deps, ORCA_RCA_ACCURACY_EVALUATOR).evaluate({
        ...example,
        metadata: incident,
        output: failed,
      }),
      evaluator(deps, ORCA_HALLUCINATION_EVALUATOR).evaluate({
        ...example,
        metadata: incident,
        output: failed,
      }),
      evaluator(deps, ORCA_CONTROL_EVALUATOR).evaluate({
        ...example,
        metadata: control,
        output: failed,
      }),
    ]);
    for (const result of results) {
      expect(result).toMatchObject({ score: null, label: 'unscored' });
    }
    expect(prompt).not.toHaveBeenCalled();
  });

  it('scores a run without a verdict on the hypotheses it recorded', async () => {
    const { deps, prompt } = judgeReturning({
      named_flags: ['productCatalogFailure'],
      named_causes: ['productCatalogFailure'],
      reasoning: 'Named in a hypothesis.',
    });
    const result = await evaluator(deps, ORCA_RCA_ACCURACY_EVALUATOR).evaluate({
      ...example,
      metadata: { case_id: 'checkout', plausible_flags: ['productCatalogFailure'] },
      output: output({ execution_error: NO_CONCLUSION_ERROR }),
    });
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ score: 1, label: 'pass' });
  });

  it('scores a section control and still leaves the set scores n/a when the flag set is empty', async () => {
    const { deps, prompt } = judgeReturning({
      named_flags: ['cartFailure'],
      named_causes: ['cartFailure'],
      claims_incident_in_quiet_window: false,
      reasoning: 'No incident in the window.',
    });
    const metadata = {
      case_id: 'checkout',
      section: 'control',
      plausible_flags: [] as string[],
      quiet_window: { start: null, end: '2026-04-19T14:01:51.404Z' },
    };
    const scored = { ...example, metadata, output: output({ structured_report: undefined }) };
    const control = await evaluator(deps, ORCA_CONTROL_EVALUATOR).evaluate(scored);
    const accuracy = await evaluator(deps, ORCA_RCA_ACCURACY_EVALUATOR).evaluate({
      ...scored,
      output: output(),
    });
    const hallucination = await evaluator(deps, ORCA_HALLUCINATION_EVALUATOR).evaluate({
      ...scored,
      output: output(),
    });
    expect(control).toMatchObject({ score: 1, label: 'pass' });
    expect(accuracy).toMatchObject({ score: null, label: 'n/a' });
    expect(hallucination).toMatchObject({ score: null, label: 'n/a' });
    expect(prompt).not.toHaveBeenCalled();
  });
});
