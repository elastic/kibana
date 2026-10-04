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

export type AgentEvaluator = Evaluator<SemanticLogExample, AgentTaskOutput>;

/** Duplicated in retrieval/evaluators.ts; copied rather than shared, to avoid a five-line module. */
const unavailable = (reason: string): EvaluationResult => ({
  score: null,
  label: 'unavailable',
  explanation: reason,
});

const toolIdsFrom = (output: AgentTaskOutput): string[] =>
  output.steps.map((step) => step.tool_id).filter((toolId): toolId is string => Boolean(toolId));

/**
 * Whether the agent reached for a log tool at all.
 * Scored `neutral` because the expected value depends on the arm: 0 in the baseline arm, where it
 * confirms the arm really was configured without the tools, and 1 in the other two.
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
 * Substring matching over prose measures whether the evidence reached the user, and nothing about
 * whether the answer reasoned well; the criteria-based judge in the spec covers that.
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
