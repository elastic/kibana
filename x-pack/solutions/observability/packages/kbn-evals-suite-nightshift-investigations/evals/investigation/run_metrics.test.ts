/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStepType } from '@kbn/agent-builder-common';
import type { ConversationRound } from '@kbn/agent-builder-common';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import {
  createRunMetricEvaluators,
  RUN_METRIC_EVALUATORS,
  summarizeRunMetrics,
  toAgentStepMetrics,
  toRoundMetrics,
} from './run_metrics';
import type { InvestigationTaskOutput, RunMetrics } from './types';

type MeasuredRound = Parameters<typeof toRoundMetrics>[0][number];
type StepExecution = WorkflowExecutionDto['stepExecutions'][number];

const toolCall = { type: ConversationRoundStepType.toolCall } as ConversationRound['steps'][number];
const reasoning = {
  type: ConversationRoundStepType.reasoning,
} as ConversationRound['steps'][number];

const round = (overrides: Partial<MeasuredRound> = {}): MeasuredRound => ({
  started_at: '2026-01-01T00:00:05.000Z',
  model_usage: {
    connector_id: 'model',
    llm_calls: 12,
    input_tokens: 400_000,
    output_tokens: 9_000,
  },
  steps: [toolCall, reasoning, toolCall],
  ...overrides,
});

const stepExecution = (overrides: Partial<StepExecution>) => overrides as StepExecution;

const output = (runMetrics?: RunMetrics): InvestigationTaskOutput => ({
  case_id: 'case',
  query: 'question',
  ...(runMetrics ? { run_metrics: runMetrics } : {}),
});

describe('toRoundMetrics', () => {
  it("counts each round's LLM and tool calls", () => {
    expect(toRoundMetrics([round()])).toEqual([
      { started_at: '2026-01-01T00:00:05.000Z', llm_calls: 12, tool_calls: 2 },
    ]);
  });

  it('measures nothing without rounds', () => {
    expect(toRoundMetrics([])).toBeUndefined();
  });
});

describe('toAgentStepMetrics', () => {
  it('keeps the agent runs and drops the wrappers that repeat their step id', () => {
    expect(
      toAgentStepMetrics({
        stepExecutions: [
          stepExecution({ stepId: 'investigate', stepType: 'fallback', executionTimeMs: 170_540 }),
          stepExecution({
            stepId: 'investigate',
            stepType: 'ai.agent',
            startedAt: '2026-01-01T00:00:05.000Z',
            executionTimeMs: 170_533,
            usage: { inputTokens: 1_373_763, cachedTokens: 0, outputTokens: 6_773, totalTokens: 0 },
          }),
          stepExecution({
            stepId: 'answer',
            stepType: 'ai.agent',
            startedAt: '2026-01-01T00:03:00.000Z',
          }),
          stepExecution({ stepId: 'notify_completed', stepType: 'nightshift.sendNotifications' }),
        ],
      })
    ).toEqual([
      {
        step_id: 'investigate',
        started_at: '2026-01-01T00:00:05.000Z',
        duration_ms: 170_533,
        input_tokens: 1_373_763,
        cached_input_tokens: 0,
        output_tokens: 6_773,
      },
      // A step that reported no usage counts as zero rather than disappearing.
      {
        step_id: 'answer',
        started_at: '2026-01-01T00:03:00.000Z',
        duration_ms: 0,
        input_tokens: 0,
        cached_input_tokens: 0,
        output_tokens: 0,
      },
    ]);
  });
});

describe('createRunMetricEvaluators', () => {
  const evaluate = async (taskOutput: InvestigationTaskOutput) =>
    Object.fromEntries(
      await Promise.all(
        createRunMetricEvaluators().map(async (evaluator) => [
          evaluator.name,
          await evaluator.evaluate({
            input: { question: 'question' },
            output: taskOutput,
            expected: undefined,
            metadata: { case_id: 'case' },
          }),
        ])
      )
    );

  it('scores every metric as a minimized CODE evaluator', () => {
    expect(
      createRunMetricEvaluators().map(({ name, kind, direction }) => [name, kind, direction])
    ).toEqual(RUN_METRIC_EVALUATORS.map((name) => [name, 'CODE', 'minimize']));
  });

  it('sums the agent steps and rounds and reports latency in seconds', async () => {
    const step = {
      step_id: 'investigate',
      started_at: '2026-01-01T00:00:05.000Z',
      duration_ms: 120_000,
      input_tokens: 400_000,
      cached_input_tokens: 300_000,
      output_tokens: 9_000,
    };
    const scores = await evaluate(
      output({
        requested_at: '2026-01-01T00:00:00.000Z',
        time_to_report_ms: 185_000,
        agent_steps: [step, { ...step, step_id: 'answer', duration_ms: 30_000 }],
        rounds: toRoundMetrics([round(), round()]),
      })
    );
    expect(scores).toEqual({
      time_to_report_s: { score: 185 },
      agent_time_s: { score: 150 },
      input_tokens: { score: 800_000 },
      cached_input_tokens: { score: 600_000 },
      output_tokens: { score: 18_000 },
      llm_calls: { score: 24 },
      tool_calls: { score: 4 },
    });
  });

  it('leaves a metric unscored when the run did not measure it', async () => {
    const scores = await evaluate(output({ requested_at: '2026-01-01T00:00:00.000Z' }));
    expect(Object.values(scores)).toEqual(
      RUN_METRIC_EVALUATORS.map(() => ({ score: null, label: 'unmeasured' }))
    );
  });
});

describe('summarizeRunMetrics', () => {
  it('reports the nearest-rank p50 and p95 of each measured metric', () => {
    const outputs = Array.from({ length: 20 }, (_, index) =>
      output({ requested_at: '2026-01-01T00:00:00.000Z', time_to_report_ms: (index + 1) * 1000 })
    );
    // A failed run that never measured anything does not shift the percentiles.
    const summary = summarizeRunMetrics([...outputs, output(), undefined]);
    expect(summary).toEqual({ time_to_report_s: { count: 20, mean: 10.5, p50: 10, p95: 19 } });
  });
});
