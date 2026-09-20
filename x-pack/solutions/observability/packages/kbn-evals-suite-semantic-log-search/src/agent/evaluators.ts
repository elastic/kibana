/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult, Evaluator } from '@kbn/evals';
import { GET_LOGS_SEMANTIC_TOOL_ID, GET_LOGS_TOOL_ID } from '../constants';
import type { CorpusProfile } from '../corpora';
import { matchedLabels, relevantLabels } from '../ground_truth';
import type { SemanticLogExample } from '../types';
import type { AgentTaskOutput } from './types';

// ─── Private helpers ────────────────────────────────────────────────────────

export type AgentEvaluator = Evaluator<SemanticLogExample, AgentTaskOutput>;

/** Duplicated from retrieval/evaluators.ts — a deliberate 5-line copy to avoid a shared module. */
const unavailable = (reason: string): EvaluationResult => ({
  score: null,
  label: 'unavailable',
  explanation: reason,
});

const toolIdsFrom = (output: AgentTaskOutput): string[] =>
  output.steps.map((step) => step.tool_id).filter((toolId): toolId is string => Boolean(toolId));

// ─── Agent evaluators ────────────────────────────────────────────────────────

/**
 * Whether the agent reached for a log tool at all. In the baseline arm the tools
 * are not available, so this is expected to be 0 and exists to prove the arm was
 * really configured without them.
 */
export const usedLogToolEvaluator: AgentEvaluator = {
  name: 'Used Log Tool',
  kind: 'CODE',
  direction: 'neutral',
  evaluate: async ({ output }) => {
    const toolIds = toolIdsFrom(output);
    const used = toolIds.includes(GET_LOGS_TOOL_ID) || toolIds.includes(GET_LOGS_SEMANTIC_TOOL_ID);
    return {
      score: used ? 1 : 0,
      label: used ? 'used' : 'not used',
      metadata: { tools: toolIds },
    };
  },
};

/**
 * How many of the labelled relevant messages the agent's answer actually names.
 *
 * Substring matching over prose is a coverage signal, not a quality judgement:
 * it says whether the evidence reached the user, and says nothing about whether
 * the answer reasoned well. The criteria-based judge in the spec covers that.
 */
export const createCitedRelevantMessagesEvaluator = (corpus: CorpusProfile): AgentEvaluator => ({
  name: 'Relevant Messages Cited',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const query = expected?.query;
    if (!query) {
      return unavailable('No ground truth on the example');
    }

    const expectedLabels = relevantLabels(query, corpus.relevanceThreshold);
    const cited = matchedLabels(output.answer, expectedLabels);

    return {
      score: cited.length,
      explanation: `${cited.length} of ${expectedLabels.length} labelled messages appear in the answer`,
      metadata: { cited },
    };
  },
});

export const agentEvaluators = (corpus: CorpusProfile): AgentEvaluator[] => [
  usedLogToolEvaluator,
  createCitedRelevantMessagesEvaluator(corpus),
];
