/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEvaluators } from '@kbn/evals';
import { extractReferenceAnswer } from '../investigation/judges/scoring';
import type { ConnectorProbeEvaluator } from './types';

const SANDBOX_BASH_TOOL_ID = 'nightshift_sandbox_bash';
const DEFAULT_TIME_BUDGET_SECONDS = 30;

/** Per-run budget from `NIGHTSHIFT_PROBE_TIME_BUDGET_S`, 30 seconds by default. */
export const getTimeBudgetSeconds = (
  value = process.env.NIGHTSHIFT_PROBE_TIME_BUDGET_S
): number => {
  if (!value) return DEFAULT_TIME_BUDGET_SECONDS;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`NIGHTSHIFT_PROBE_TIME_BUDGET_S must be a positive number, got "${value}"`);
  }
  return seconds;
};

/** Scores whether at least one sandbox command reached Elasticsearch through the connector. */
export const connectorUsedEvaluator: ConnectorProbeEvaluator = {
  name: 'connector_used',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const { tool_call_trajectory: trajectory, execution_error: executionError } = output;
    if (executionError) {
      return { score: 0, explanation: `The run failed: ${executionError}` };
    }
    const connectorCalls = trajectory.filter(
      ({ tool_id: toolId, params }) =>
        toolId === SANDBOX_BASH_TOOL_ID && typeof params.connector_id === 'string'
    );
    return {
      score: connectorCalls.length > 0 ? 1 : 0,
      explanation:
        connectorCalls.length > 0
          ? `${connectorCalls.length} of ${trajectory.length} tool call(s) passed a connector_id.`
          : `None of the ${trajectory.length} tool call(s) passed a connector_id.`,
      metadata: {
        connector_calls: connectorCalls.length,
        tool_calls: trajectory.length,
      },
    };
  },
};

/** Scores whether the whole agent run finished within the time budget. */
export const createWithinTimeBudgetEvaluator = (
  budgetSeconds: number = getTimeBudgetSeconds()
): ConnectorProbeEvaluator => ({
  name: 'within_time_budget',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const seconds = output.duration_ms / 1000;
    return {
      score: !output.execution_error && seconds <= budgetSeconds ? 1 : 0,
      explanation: `The run took ${seconds.toFixed(1)}s against a ${budgetSeconds}s budget.`,
      metadata: { duration_seconds: seconds, budget_seconds: budgetSeconds },
    };
  },
});

/**
 * Grades the reply and tool calls against the example's `reference_answer` with the criteria
 * judge. The criterion is built per example, so it cannot be a single shared criteria evaluator.
 */
export const createReferenceBehaviourEvaluator = (
  evaluators: Pick<DefaultEvaluators, 'criteria'>
): ConnectorProbeEvaluator => ({
  name: 'reference_behaviour',
  kind: 'LLM',
  direction: 'maximize',
  getModel: evaluators.criteria([]).getModel,
  evaluate: async (params) => {
    const reference = extractReferenceAnswer(params.expected);
    if (!reference) {
      return { score: null, explanation: 'The example has no reference_answer to grade against.' };
    }
    if (params.output.execution_error) {
      return { score: 0, explanation: `The run failed: ${params.output.execution_error}` };
    }
    return evaluators
      .criteria([
        `The assistant's response and its tool calls (tool_call_trajectory) show this behaviour: ${reference}`,
      ])
      .evaluate(params);
  },
});

export const createConnectorProbeEvaluators = (
  evaluators: Pick<DefaultEvaluators, 'criteria'>
): ConnectorProbeEvaluator[] => [
  connectorUsedEvaluator,
  createWithinTimeBudgetEvaluator(),
  createReferenceBehaviourEvaluator(evaluators),
];
