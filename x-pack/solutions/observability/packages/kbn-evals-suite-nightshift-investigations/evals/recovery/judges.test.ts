/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type { EvalConnector } from '@kbn/evals';
import type { InvestigationTaskOutput } from '../investigation/types';
import {
  createCausalChecklistEvaluator,
  createEvidenceFamiliesEvaluator,
  createRootCauseEvidenceEvaluator,
} from './judges';
import { CAUSAL_STRATEGY_IDS } from './strategies';

const output: InvestigationTaskOutput = {
  case_id: 'case-1',
  query: 'An alert in this investigation has recovered at 2026-11-12T09:17:53Z.',
  structured_report: { conclusion: 'The alert closed after a restart; the failure never stopped.' },
  tool_call_trajectory: [
    {
      tool_id: 'nightshift_sandbox_bash',
      params: { command: 'curl "$URL/.alerts-*/_search"' },
      result: 'exit_code: 0 | stdout: {"hits":{"total":{"value":1}}}',
    },
    {
      tool_id: 'nightshift_sandbox_bash',
      params: { command: 'curl "$URL/.kibana-event-log-*/_search"' },
      result: 'Error: unauthorized',
    },
  ],
};
const input = { question: 'An alert fired.', prior_response: 'Hypothesis A: a bad deploy.' };

const createDeps = (judgeOutput: unknown) => {
  const prompt = jest
    .fn()
    .mockResolvedValue({ toolCalls: [{ function: { arguments: judgeOutput } }] });
  return {
    prompt,
    deps: {
      inferenceClient: { prompt } as unknown as BoundInferenceClient,
      evaluationConnector: { id: 'judge', name: 'judge' } as unknown as EvalConnector,
      log: { warning: jest.fn() } as unknown as ToolingLog,
    },
  };
};

const run = (
  evaluator: ReturnType<typeof createCausalChecklistEvaluator>,
  taskOutput: InvestigationTaskOutput = output
) =>
  evaluator.evaluate({
    input,
    output: taskOutput,
    expected: undefined,
    metadata: undefined,
  } as unknown as Parameters<typeof evaluator.evaluate>[0]);

describe('recovery checklist judge', () => {
  it('reads the recovery request, the earlier answer and the calls, and credits only cited calls', async () => {
    const { prompt, deps } = createDeps({
      strategies: [
        { id: 'alert_record', status: 'ran', step: 1, note: 'read it' },
        { id: 'rule_execution_trace', status: 'blocked', step: 2, note: 'denied' },
        { id: 'refire_check', status: 'ran', step: 0, note: 'made up' },
      ],
      summary: 'Read the alert, could not read the event log.',
    });

    const result = await run(createCausalChecklistEvaluator(deps));

    const { input: judgeInput, toolChoice } = prompt.mock.calls[0][0];
    expect(toolChoice).toEqual({ function: 'score_recovery_checklist' });
    expect(judgeInput.transcript).toContain('recovered at 2026-11-12T09:17:53Z');
    expect(judgeInput.transcript).toContain('## Tool call 2');
    expect(judgeInput.earlier_answers).toContain('Hypothesis A: a bad deploy.');
    expect(result).toMatchObject({
      score: 1.5 / CAUSAL_STRATEGY_IDS.length,
      label: '1 ran / 1 blocked / 15 not run',
    });
    expect(result.explanation).toContain('Claimed without a cited tool call: refire_check');
    expect(result.metadata?.strategies).toContainEqual(
      expect.objectContaining({ id: 'rule_execution_trace', step: 2, note: 'denied' })
    );
  });

  it('scores a report that made no tool calls instead of skipping it', async () => {
    const { deps } = createDeps({ strategies: [], summary: 'No tool calls.' });

    const result = await run(createCausalChecklistEvaluator(deps), {
      ...output,
      tool_call_trajectory: [],
    });

    expect(result.score).toBe(0);
    expect(result.label).toBe('0 ran / 0 blocked / 17 not run');
  });

  it('is n/a only when the investigation recorded no report', async () => {
    const { prompt, deps } = createDeps({ strategies: [], summary: '' });

    const result = await run(createCausalChecklistEvaluator(deps), {
      ...output,
      structured_report: undefined,
    });

    expect(result.score).toBeNull();
    expect(prompt).not.toHaveBeenCalled();
  });
});

describe('recovery root-cause evidence judge', () => {
  it('snaps scores to the rubric and keeps the levels for monitoring', async () => {
    const { prompt, deps } = createDeps({
      mechanism_claim: 'a service account lacks read access',
      mechanism_evidenced: 0.8,
      closure_claim: 'none',
      closure_evidenced: 0,
      unsupported_claim: false,
      reasoning: 'ok',
    });

    const result = await run(createRootCauseEvidenceEvaluator(deps));

    expect(prompt.mock.calls[0][0].input.transcript).toContain('recovered at 2026-11-12T09:17:53Z');
    expect(result).toMatchObject({
      score: 0.5,
      label: 'supported',
      metadata: { mechanism_evidenced: 1, mechanism_level: 'evidenced', closure_level: 'none' },
    });
  });
});

describe('recovery evidence families judge', () => {
  it('does not offer the chat family, which the guardrail forbids, and counts only cited calls', async () => {
    const { prompt, deps } = createDeps({
      families: [
        { id: 'alert_documents', queried: true, step: 1 },
        { id: 'rule_event_log', queried: true, step: 2 },
        { id: 'apm_metrics', queried: true, step: 0 },
      ],
    });

    const result = await run(createEvidenceFamiliesEvaluator(deps));

    expect(JSON.stringify(prompt.mock.calls[0][0].prompt)).not.toContain(
      'chat_or_incident_records'
    );
    expect(result).toMatchObject({ score: 2 / 8, label: '2/8 families' });
    expect(result.metadata?.families).toEqual(['alert_documents', 'rule_event_log']);
  });

  it('scores a round with no tool calls 0, without a model call', async () => {
    const { prompt, deps } = createDeps({ families: [] });

    const result = await run(createEvidenceFamiliesEvaluator(deps), {
      ...output,
      tool_call_trajectory: [],
    });

    expect(prompt).not.toHaveBeenCalled();
    expect(result.score).toBe(0);
  });
});
