/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { EvalConnector } from '@kbn/evals';
import { ToolingLog } from '@kbn/tooling-log';
import type { InvestigationTaskOutput } from '../types';
import { NO_CONCLUSION_ERROR } from '../task';
import type { JsonValue, OrcaRubric } from './check_prediction';
import { buildControlPrompt, buildJudgePrompt } from './check_prediction';
import {
  createOrcaEvaluators,
  ORCA_CONTROL_EVALUATOR,
  ORCA_FLAGS_HALLUCINATION_EVALUATOR,
  ORCA_FLAGS_RCA_ACCURACY_EVALUATOR,
  ORCA_HALLUCINATION_EVALUATOR,
  ORCA_RCA_ACCURACY_EVALUATOR,
  ORCA_RCA_DEPTH_EVALUATOR,
  ORCA_REPORT_FIDELITY_EVALUATOR,
  resolveOrcaLegacyJudges,
} from './evaluators';
import { OrcaControlJudgePrompt, OrcaFlagsJudgePrompt, OrcaIncidentJudgePrompt } from './prompts';
import { getOrcaRubrics } from './rubrics';

jest.mock('@kbn/inference-tracing', () => ({
  ElasticGenAIAttributes: { InferenceSpanKind: 'elastic.inference.span.kind' },
  withActiveInferenceSpan: (_name: string, _options: object, callback: () => Promise<object>) =>
    callback(),
}));

const judgeReturning = (...answers: JsonValue[]) => {
  const prompt = jest.fn();
  for (const answer of answers) {
    prompt.mockResolvedValueOnce({ toolCalls: [{ function: { arguments: answer } }] });
  }
  prompt.mockResolvedValue({ toolCalls: [{ function: { arguments: answers.at(-1) } }] });
  return {
    prompt,
    deps: {
      inferenceClient: { prompt } as unknown as BoundInferenceClient,
      evaluationConnector: { id: 'judge' } as EvalConnector,
      log: new ToolingLog(),
    },
  };
};

type Deps = ReturnType<typeof judgeReturning>['deps'];

const evaluator = (deps: Deps, name: string, legacy = false) => {
  const found = createOrcaEvaluators(deps, { rubrics: RUBRICS, legacy }).find(
    (each) => each.name === name
  );
  if (!found) throw new Error(`missing ${name}`);
  return found;
};

// Hand-written rubrics in ORCA's format, so no ORCA ground truth lives in the repo.
const RUBRICS: ReadonlyMap<string, OrcaRubric> = new Map(
  Object.entries(
    JSON.parse(readFileSync(join(__dirname, '__fixtures__', 'synthetic_rubrics.json'), 'utf8'))
  )
);
const CART_OUTAGE = 'synthetic-cartOutage-on';
const SYNTH_LATENCY = 'synthetic-synthLatency-50%';

const event = (eventId: string, rootCause: string) => ({
  event_id: eventId,
  root_cause: rootCause,
  event_time: '2026-04-22T20:22:41.236522+00:00',
});

const incidentMetadata = {
  case_id: 'checkout',
  orca_expected: {
    // Out of order, so the judge's rubric order comes from the verifier's sort.
    events: [event(SYNTH_LATENCY, 'paymentUnreachable'), event(CART_OUTAGE, 'paymentFailure')],
    current: '2026-04-23T04:52:46.740910+00:00',
  },
};

const controlExpected = {
  events: [],
  current: '2026-04-22T09:00:00-04:00',
  quiet_window_start: '2026-04-21T22:46:44.092046+00:00',
  quiet_window_end: '2026-04-22T14:21:00.987886+00:00',
};
const controlMetadata = { case_id: 'quiet', control: true, orca_expected: controlExpected };

const REPORT = '## Summary\n\nCheckout failed because paymentFailure was set to 10%.';

const example = { input: { question: 'Why did checkout fail?' }, expected: {} };

const output = (overrides: Partial<InvestigationTaskOutput> = {}): InvestigationTaskOutput => ({
  case_id: 'checkout',
  query: example.input.question,
  investigation_id: 'investigation',
  structured_report: { conclusion: 'paymentFailure at 10% broke checkout.' },
  orca_report_md: REPORT,
  ...overrides,
});

const verdict = (flag: string, score: number, flagMatch: boolean) => ({
  feature_flag: flag,
  incident_time_within_10min: flagMatch,
  feature_flag_match: flagMatch,
  mechanism_match: flagMatch,
  symptoms: { metrics: [], logs: [], traces: [] },
  score,
});

describe('ORCA graders', () => {
  it('scores accuracy, depth and hallucination from one incident judge call', async () => {
    const { deps, prompt } = judgeReturning({
      rubrics: [verdict('paymentFailure', 3, true), verdict('paymentUnreachable', 0, false)],
    });
    const evaluators = createOrcaEvaluators(deps, { rubrics: RUBRICS, legacy: false });
    const taskOutput = output();
    const score = (name: string) =>
      evaluators
        .find((each) => each.name === name)
        // The runner spreads a new output object for each evaluator.
        ?.evaluate({ ...example, metadata: incidentMetadata, output: { ...taskOutput } });

    const [accuracy, depth, hallucination] = await Promise.all([
      score(ORCA_RCA_ACCURACY_EVALUATOR),
      score(ORCA_RCA_DEPTH_EVALUATOR),
      score(ORCA_HALLUCINATION_EVALUATOR),
    ]);

    expect(prompt).toHaveBeenCalledTimes(1);
    const rubrics = getOrcaRubrics(
      { events: [event(CART_OUTAGE, ''), event(SYNTH_LATENCY, '')] },
      RUBRICS
    );
    if (!('rubrics' in rubrics)) throw new Error('missing rubrics');
    expect(prompt).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: OrcaIncidentJudgePrompt,
        input: { prompt: buildJudgePrompt(rubrics.rubrics, REPORT) },
        toolChoice: { function: 'score' },
      })
    );
    // Accuracy needs every rubric's flag; one named flag is no hallucination.
    expect(accuracy).toMatchObject({ score: 0, label: 'fail' });
    expect(depth).toMatchObject({ score: 0.5, label: '1.5/3' });
    expect(hallucination).toMatchObject({ score: 0, label: 'pass' });
  });

  it('scores a hallucination when the report matches no rubric', async () => {
    const { deps } = judgeReturning({
      rubrics: [verdict('paymentFailure', 1, false), verdict('paymentUnreachable', 1, false)],
    });
    const result = await evaluator(deps, ORCA_HALLUCINATION_EVALUATOR).evaluate({
      ...example,
      metadata: incidentMetadata,
      output: output(),
    });
    expect(result).toMatchObject({ score: 1, label: 'hallucinated' });
  });

  it('retries a judge answer with an out-of-range score', async () => {
    const { deps, prompt } = judgeReturning(
      { rubrics: [verdict('paymentFailure', 5, true), verdict('paymentUnreachable', 0, false)] },
      { rubrics: [verdict('paymentFailure', 3, true), verdict('paymentUnreachable', 3, true)] }
    );
    const result = await evaluator(deps, ORCA_RCA_ACCURACY_EVALUATOR).evaluate({
      ...example,
      metadata: incidentMetadata,
      output: output(),
    });
    expect(prompt).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ score: 1, label: 'pass' });
  });

  it('retries a judge answer without a verdict for every rubric', async () => {
    const { deps, prompt } = judgeReturning(
      { rubrics: [verdict('paymentFailure', 3, true)] },
      { rubrics: [verdict('paymentFailure', 3, true), verdict('paymentUnreachable', 3, true)] }
    );
    const result = await evaluator(deps, ORCA_RCA_ACCURACY_EVALUATOR).evaluate({
      ...example,
      metadata: incidentMetadata,
      output: output(),
    });
    expect(prompt).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ score: 1, label: 'pass' });
  });

  it('scores an empty incident report 0 without calling the judge', async () => {
    const { deps, prompt } = judgeReturning({});
    const input = {
      ...example,
      metadata: incidentMetadata,
      output: output({ orca_report_md: '' }),
    };
    const results = await Promise.all(
      [ORCA_RCA_ACCURACY_EVALUATOR, ORCA_RCA_DEPTH_EVALUATOR, ORCA_HALLUCINATION_EVALUATOR].map(
        (name) => evaluator(deps, name).evaluate(input)
      )
    );
    expect(prompt).not.toHaveBeenCalled();
    expect(results.map(({ score }) => score)).toEqual([0, 0, 0]);
  });

  it('passes an empty control report without calling the judge', async () => {
    const { deps, prompt } = judgeReturning({});
    const result = await evaluator(deps, ORCA_CONTROL_EVALUATOR).evaluate({
      ...example,
      metadata: controlMetadata,
      output: output({ orca_report_md: '  \n' }),
    });
    expect(prompt).not.toHaveBeenCalled();
    expect(result).toMatchObject({ score: 1, label: 'pass' });
  });

  it("gives the control judge ORCA's prompt and fails an incident inside the window", async () => {
    const { deps, prompt } = judgeReturning({
      reasoning: 'The report says checkout is failing now.',
      claims_incident_in_quiet_window: true,
    });
    const result = await evaluator(deps, ORCA_CONTROL_EVALUATOR).evaluate({
      ...example,
      metadata: controlMetadata,
      output: output(),
    });
    expect(prompt).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: OrcaControlJudgePrompt,
        input: { prompt: buildControlPrompt(controlExpected, REPORT) },
      })
    );
    expect(result).toMatchObject({
      score: 0,
      label: 'fail',
      explanation: 'The report says checkout is failing now.',
    });
  });

  it('asks the control judge for its reasoning before its decision', () => {
    const [version] = OrcaControlJudgePrompt.versions;
    const { required } = version.tools?.score.schema as { required: string[] };
    expect(required[0]).toBe('reasoning');
  });

  it('keeps incident scores n/a on a control and the control score n/a on an incident', async () => {
    const { deps, prompt } = judgeReturning({});
    const accuracy = await evaluator(deps, ORCA_RCA_ACCURACY_EVALUATOR).evaluate({
      ...example,
      metadata: controlMetadata,
      output: output(),
    });
    const control = await evaluator(deps, ORCA_CONTROL_EVALUATOR).evaluate({
      ...example,
      metadata: incidentMetadata,
      output: output(),
    });
    expect(accuracy).toMatchObject({ score: null, label: 'n/a' });
    expect(control).toMatchObject({ score: null, label: 'n/a' });
    expect(prompt).not.toHaveBeenCalled();
  });

  it('is n/a without ORCA ground truth or a vendored rubric', async () => {
    const { deps, prompt } = judgeReturning({});
    const withoutTruth = await evaluator(deps, ORCA_RCA_ACCURACY_EVALUATOR).evaluate({
      ...example,
      metadata: { case_id: 'medium', plausible_flags: ['adFailure'] },
      output: output(),
    });
    const unknownEvent = await evaluator(deps, ORCA_RCA_ACCURACY_EVALUATOR).evaluate({
      ...example,
      metadata: { case_id: 'x', orca_expected: { events: [event('unknown-event', 'x')] } },
      output: output(),
    });
    expect(withoutTruth).toMatchObject({ score: null, label: 'n/a' });
    expect(unknownEvent).toMatchObject({
      score: null,
      label: 'n/a',
      explanation: 'No ORCA rubric for unknown-event.',
    });
    expect(prompt).not.toHaveBeenCalled();
  });

  it.each([
    ['a timeout', 'Investigation was still in progress after 30 minutes'],
    ['a failed agent round', 'Investigation round failed: model error'],
    ['a run that ended with nothing recorded', NO_CONCLUSION_ERROR],
  ])('scores %s 0, as the verifier scores a trial without report.md', async (_, executionError) => {
    const { deps, prompt } = judgeReturning({});
    const failed = output({
      execution_error: executionError,
      structured_report: undefined,
      orca_report_md: undefined,
    });
    const evaluate = (name: string, metadata: object) =>
      evaluator(deps, name).evaluate({ ...example, metadata, output: failed } as never);
    const [accuracy, depth, hallucination, control, fidelity] = await Promise.all([
      evaluate(ORCA_RCA_ACCURACY_EVALUATOR, incidentMetadata),
      evaluate(ORCA_RCA_DEPTH_EVALUATOR, incidentMetadata),
      evaluate(ORCA_HALLUCINATION_EVALUATOR, incidentMetadata),
      evaluate(ORCA_CONTROL_EVALUATOR, controlMetadata),
      evaluate(ORCA_REPORT_FIDELITY_EVALUATOR, incidentMetadata),
    ]);
    expect([accuracy, depth, hallucination, control].map(({ score }) => score)).toEqual([
      0, 0, 0, 0,
    ]);
    expect(control).toMatchObject({ label: 'fail', metadata: { orca_mode: 'agent_failure' } });
    expect(fidelity).toMatchObject({ score: null, label: 'n/a' });
    expect(prompt).not.toHaveBeenCalled();
  });

  it.each([
    [
      'a harness error',
      {
        execution_error: 'Investigation was not created within 30 minutes',
        orca_report_md: undefined,
      },
    ],
    ['an aborted round', { execution_error: 'Investigation round was aborted by system' }],
    ['a failed report write', { orca_report_md: undefined, orca_report_error: 'model down' }],
    ['a run without report.md', { orca_report_md: undefined }],
    ['a truncated report.md', { orca_report_truncated: true }],
  ])('leaves every ORCA score unscored after %s', async (_, overrides) => {
    const { deps, prompt } = judgeReturning({});
    const failed = output(overrides);
    const results = await Promise.all([
      evaluator(deps, ORCA_RCA_ACCURACY_EVALUATOR).evaluate({
        ...example,
        metadata: incidentMetadata,
        output: failed,
      }),
      evaluator(deps, ORCA_CONTROL_EVALUATOR).evaluate({
        ...example,
        metadata: controlMetadata,
        output: failed,
      }),
      evaluator(deps, ORCA_REPORT_FIDELITY_EVALUATOR).evaluate({
        ...example,
        metadata: incidentMetadata,
        output: failed,
      }),
    ]);
    for (const result of results) {
      expect(result).toMatchObject({ score: null, label: 'unscored' });
    }
    expect(prompt).not.toHaveBeenCalled();
  });

  it('scores a run without a verdict on the report written from its hypotheses', async () => {
    const { deps } = judgeReturning({
      rubrics: [verdict('paymentFailure', 3, true), verdict('paymentUnreachable', 3, true)],
    });
    const result = await evaluator(deps, ORCA_RCA_ACCURACY_EVALUATOR).evaluate({
      ...example,
      metadata: incidentMetadata,
      output: output({
        execution_error: NO_CONCLUSION_ERROR,
        structured_report: { hypotheses: [{ candidate: 'paymentFailure', status: 'confirmed' }] },
      } as Partial<InvestigationTaskOutput>),
    });
    expect(result).toMatchObject({ score: 1, label: 'pass' });
  });
});

describe('ORCA report fidelity', () => {
  it('fails a report that adds a cause the investigation did not name', async () => {
    const { deps, prompt } = judgeReturning({
      reasoning: 'The report adds a Redis outage.',
      unsupported_causes: ['Redis outage'],
      verdict_preserved: true,
    });
    const result = await evaluator(deps, ORCA_REPORT_FIDELITY_EVALUATOR).evaluate({
      ...example,
      metadata: incidentMetadata,
      output: output(),
    });
    expect(prompt.mock.calls[0][0].input).toEqual({
      question: example.input.question,
      investigation: 'Conclusion: paymentFailure at 10% broke checkout.',
      report: REPORT,
    });
    expect(result).toMatchObject({
      score: 0,
      label: 'unsupported_cause',
      metadata: { unsupported_causes: ['Redis outage'] },
    });
  });

  it('shows an empty report as empty and fails a dropped verdict', async () => {
    const { deps, prompt } = judgeReturning({
      reasoning: 'The investigation found an incident.',
      unsupported_causes: [],
      verdict_preserved: false,
    });
    const result = await evaluator(deps, ORCA_REPORT_FIDELITY_EVALUATOR).evaluate({
      ...example,
      metadata: incidentMetadata,
      output: output({ orca_report_md: '' }),
    });
    expect(prompt.mock.calls[0][0].input.report).toBe('(empty report)');
    expect(result).toMatchObject({ score: 0, label: 'verdict_changed' });
  });
});

describe('legacy ORCA flag scores', () => {
  it('are registered only when asked for', () => {
    const { deps } = judgeReturning({});
    const names = (legacy: boolean) =>
      createOrcaEvaluators(deps, { rubrics: RUBRICS, legacy }).map(({ name }) => name);
    expect(names(false)).toEqual([
      ORCA_RCA_ACCURACY_EVALUATOR,
      ORCA_RCA_DEPTH_EVALUATOR,
      ORCA_HALLUCINATION_EVALUATOR,
      ORCA_CONTROL_EVALUATOR,
      ORCA_REPORT_FIDELITY_EVALUATOR,
    ]);
    expect(names(true).slice(5)).toEqual([
      ORCA_FLAGS_RCA_ACCURACY_EVALUATOR,
      ORCA_FLAGS_HALLUCINATION_EVALUATOR,
    ]);
    expect(resolveOrcaLegacyJudges({ NIGHTSHIFT_ORCA_LEGACY_JUDGES: 'true' })).toBe(true);
    expect(resolveOrcaLegacyJudges({})).toBe(false);
  });

  it('asks the flags judge for its reasoning before its decision', () => {
    const [version] = OrcaFlagsJudgePrompt.versions;
    const { required } = version.tools?.score.schema as { required: string[] };
    expect(required[0]).toBe('reasoning');
  });

  const legacyMetadata = { case_id: 'checkout', plausible_flags: ['productCatalogFailure'] };

  it('score accuracy and hallucination from one flag extraction', async () => {
    const { deps, prompt } = judgeReturning({
      named_flags: ['productCatalogFailure'],
      named_causes: ['productCatalogFailure', 'paymentServiceMemoryLeak'],
      reasoning: 'An extra cause.',
    });
    const evaluators = createOrcaEvaluators(deps, { rubrics: RUBRICS, legacy: true });
    const taskOutput = output();
    const [accuracy, hallucination] = await Promise.all(
      [ORCA_FLAGS_RCA_ACCURACY_EVALUATOR, ORCA_FLAGS_HALLUCINATION_EVALUATOR].map((name) =>
        evaluators
          .find((each) => each.name === name)
          ?.evaluate({ ...example, metadata: legacyMetadata, output: { ...taskOutput } })
      )
    );
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(accuracy).toMatchObject({ score: 1, label: 'pass' });
    expect(hallucination).toMatchObject({ score: 0, label: 'pass' });
  });

  it('score a hallucination when no named cause is in the plausible set', async () => {
    const { deps } = judgeReturning({
      named_flags: [],
      named_causes: ['paymentServiceMemoryLeak'],
      reasoning: 'No plausible flag.',
    });
    const result = await evaluator(deps, ORCA_FLAGS_HALLUCINATION_EVALUATOR, true).evaluate({
      ...example,
      metadata: legacyMetadata,
      output: output(),
    });
    expect(result).toMatchObject({ score: 1, label: 'hallucinated' });
  });

  it('stay n/a on a control and unscored after a crash', async () => {
    const { deps, prompt } = judgeReturning({});
    const control = await evaluator(deps, ORCA_FLAGS_RCA_ACCURACY_EVALUATOR, true).evaluate({
      ...example,
      metadata: { case_id: 'quiet', no_incident: true, plausible_flags: [] },
      output: output(),
    });
    const crashed = await evaluator(deps, ORCA_FLAGS_HALLUCINATION_EVALUATOR, true).evaluate({
      ...example,
      metadata: legacyMetadata,
      output: output({ execution_error: 'Service unavailable' }),
    });
    expect(control).toMatchObject({ score: null, label: 'n/a' });
    expect(crashed).toMatchObject({ score: null, label: 'unscored' });
    expect(prompt).not.toHaveBeenCalled();
  });
});
