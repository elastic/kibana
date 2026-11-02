/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { InvestigationExample, InvestigationTaskOutput } from './types';

export const UNCACHED_INPUT_TOKENS_EVALUATOR = 'uncached_input_tokens';
export const OUTPUT_TOKENS_EVALUATOR = 'output_tokens';
export const LATENCY_SECONDS_EVALUATOR = 'latency_seconds';
export const TOOL_CALLS_TOTAL_EVALUATOR = 'tool_calls_total';
export const DECISION_TREES_ACCESSED_EVALUATOR = 'decision_trees_accessed';

type InvestigationEvaluator = Evaluator<InvestigationExample, InvestigationTaskOutput>;

const NO_CONVERSATION_EXPLANATION =
  'The investigation conversation was not read, so there is nothing to measure.';

/** A raw (not 0-1) count or duration, or `n/a` when the run never reached its conversation. */
const measure = (
  value: number | undefined,
  label: string,
  explanation: string,
  metadata?: Record<string, number>
) =>
  value === undefined
    ? { score: null, label: 'n/a', explanation: NO_CONVERSATION_EXPLANATION }
    : { score: value, label, explanation, metadata };

/** Input tokens that were not served from the provider's cache, summed over every round. */
export const uncachedInputTokensEvaluator: InvestigationEvaluator = {
  name: UNCACHED_INPUT_TOKENS_EVALUATOR,
  kind: 'CODE',
  direction: 'minimize',
  evaluate: async ({ output }) => {
    const usage = output?.usage;
    if (!usage) return measure(undefined, '', '');
    const { input_tokens: input, cached_input_tokens: cached } = usage;
    const uncached = Math.max(0, input - cached);
    return measure(uncached, 'tokens', `${uncached} of ${input} input tokens were not cached.`, {
      input_tokens: input,
      cached_input_tokens: cached,
    });
  },
};

export const outputTokensEvaluator: InvestigationEvaluator = {
  name: OUTPUT_TOKENS_EVALUATOR,
  kind: 'CODE',
  direction: 'minimize',
  evaluate: async ({ output }) =>
    measure(
      output?.usage?.output_tokens,
      'tokens',
      `The investigation generated ${output?.usage?.output_tokens} output tokens.`,
      output?.usage ? { llm_calls: output.usage.llm_calls } : undefined
    ),
};

/** Wall-clock time the agent spent answering, summed over every round (excludes queueing). */
export const latencySecondsEvaluator: InvestigationEvaluator = {
  name: LATENCY_SECONDS_EVALUATOR,
  kind: 'CODE',
  direction: 'minimize',
  evaluate: async ({ output }) => {
    const latencyMs = output?.usage?.latency_ms;
    const seconds = latencyMs === undefined ? undefined : Math.round(latencyMs) / 1000;
    return measure(seconds, 'seconds', `The agent took ${seconds} seconds across all rounds.`);
  },
};

export const toolCallsTotalEvaluator: InvestigationEvaluator = {
  name: TOOL_CALLS_TOTAL_EVALUATOR,
  kind: 'CODE',
  direction: 'minimize',
  evaluate: async ({ output }) =>
    measure(
      output?.tool_call_count,
      'tool_calls',
      `The investigation made ${output?.tool_call_count} tool calls.`
    ),
};

/** How many decision trees (symptom playbooks) were successfully read; failed reads don't count. */
export const decisionTreesAccessedEvaluator: InvestigationEvaluator = {
  name: DECISION_TREES_ACCESSED_EVALUATOR,
  kind: 'CODE',
  direction: 'neutral',
  evaluate: async ({ output }) => {
    // The task leaves the field unset when no tree was read, so only a read conversation can say zero.
    if (output?.conversation_round_count === undefined) return measure(undefined, '', '');
    const treeIds = (output.decision_trees_accessed ?? []).map(({ tree_id: treeId }) => treeId);
    return {
      score: treeIds.length,
      label: 'decision_trees',
      explanation: treeIds.length
        ? `The investigation read ${treeIds.length} decision tree(s): ${treeIds.join(', ')}.`
        : 'The investigation read no decision tree.',
    };
  },
};

export const efficiencyEvaluators: InvestigationEvaluator[] = [
  uncachedInputTokensEvaluator,
  outputTokensEvaluator,
  latencySecondsEvaluator,
  toolCallsTotalEvaluator,
  decisionTreesAccessedEvaluator,
];
