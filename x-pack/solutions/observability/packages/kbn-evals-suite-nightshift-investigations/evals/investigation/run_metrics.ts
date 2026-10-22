/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isToolCallStep } from '@kbn/agent-builder-common';
import type { ConversationRound } from '@kbn/agent-builder-common';
import type { Evaluator } from '@kbn/evals';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import type {
  AgentStepMetrics,
  InvestigationExample,
  InvestigationTaskOutput,
  RoundMetrics,
  RunMetrics,
} from './types';

const AI_AGENT_STEP_TYPE = 'ai.agent';

/** Each round's LLM and tool calls; undefined when there are no rounds to count. */
export const toRoundMetrics = (
  rounds: ReadonlyArray<Pick<ConversationRound, 'started_at' | 'model_usage' | 'steps'>>
): RoundMetrics[] | undefined =>
  rounds.length === 0
    ? undefined
    : rounds.map(({ started_at: startedAt, model_usage: usage, steps }) => ({
        started_at: startedAt,
        llm_calls: usage?.llm_calls ?? 0,
        tool_calls: steps.filter(isToolCallStep).length,
      }));

/**
 * Duration and token usage of each `ai.agent` step the workflow ran. A step's retry and timeout
 * wrappers repeat its id with a different type, so only the agent run itself is kept.
 */
export const toAgentStepMetrics = ({
  stepExecutions,
}: Pick<WorkflowExecutionDto, 'stepExecutions'>): AgentStepMetrics[] =>
  stepExecutions
    .filter(({ stepType }) => stepType === AI_AGENT_STEP_TYPE)
    .map(({ stepId, startedAt, executionTimeMs, usage }) => ({
      step_id: stepId,
      started_at: startedAt,
      duration_ms: executionTimeMs ?? 0,
      input_tokens: usage?.inputTokens ?? 0,
      cached_input_tokens: usage?.cachedTokens ?? 0,
      output_tokens: usage?.outputTokens ?? 0,
    }));

const sum =
  <T>(read: (metrics: RunMetrics) => T[] | undefined, field: (item: T) => number) =>
  (metrics: RunMetrics): number | undefined =>
    read(metrics)?.reduce((total, item) => total + field(item), 0);

const agentSteps = ({ agent_steps: steps }: RunMetrics) => steps;
const rounds = ({ rounds: measured }: RunMetrics) => measured;
const toSeconds =
  (measure: (metrics: RunMetrics) => number | undefined) =>
  (metrics: RunMetrics): number | undefined => {
    const ms = measure(metrics);
    return ms === undefined ? undefined : ms / 1000;
  };

interface RunMetric {
  name: string;
  measure: (metrics: RunMetrics) => number | undefined;
}

/** Cost and latency signals scored per run; lower is better for every one of them. */
export const RUN_METRICS: readonly RunMetric[] = [
  { name: 'time_to_report_s', measure: toSeconds(({ time_to_report_ms: ms }) => ms) },
  { name: 'agent_time_s', measure: toSeconds(sum(agentSteps, (step) => step.duration_ms)) },
  { name: 'input_tokens', measure: sum(agentSteps, (step) => step.input_tokens) },
  { name: 'cached_input_tokens', measure: sum(agentSteps, (step) => step.cached_input_tokens) },
  { name: 'output_tokens', measure: sum(agentSteps, (step) => step.output_tokens) },
  { name: 'llm_calls', measure: sum(rounds, (round) => round.llm_calls) },
  { name: 'tool_calls', measure: sum(rounds, (round) => round.tool_calls) },
];

export const RUN_METRIC_EVALUATORS = RUN_METRICS.map(({ name }) => name);

const measureRun = (
  { measure }: RunMetric,
  output: InvestigationTaskOutput | undefined
): number | undefined => (output?.run_metrics ? measure(output.run_metrics) : undefined);

/** CODE evaluators that record each run metric as a score, so runs compare like judge scores. */
export const createRunMetricEvaluators = (): Array<
  Evaluator<InvestigationExample, InvestigationTaskOutput>
> =>
  RUN_METRICS.map((metric) => ({
    name: metric.name,
    kind: 'CODE',
    direction: 'minimize',
    evaluate: async ({ output }) => {
      const value = measureRun(metric, output);
      return value === undefined ? { score: null, label: 'unmeasured' } : { score: value };
    },
  }));

/** Nearest-rank percentile of an ascending list. */
const percentile = (sorted: readonly number[], fraction: number): number =>
  sorted[Math.max(0, Math.ceil(fraction * sorted.length) - 1)];

export interface RunMetricSummary {
  count: number;
  mean: number;
  p50: number;
  p95: number;
}

/** Spread of each run metric across the measured runs; metrics no run measured are left out. */
export const summarizeRunMetrics = (
  outputs: ReadonlyArray<InvestigationTaskOutput | undefined>
): Record<string, RunMetricSummary> =>
  Object.fromEntries(
    RUN_METRICS.flatMap((metric) => {
      const values = outputs
        .map((output) => measureRun(metric, output))
        .filter((value): value is number => value !== undefined)
        .sort((a, b) => a - b);
      if (values.length === 0) return [];
      const mean = values.reduce((total, value) => total + value, 0) / values.length;
      return [
        [
          metric.name,
          {
            count: values.length,
            mean,
            p50: percentile(values, 0.5),
            p95: percentile(values, 0.95),
          },
        ],
      ];
    })
  );
