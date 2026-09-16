/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { GET_LOGS_TOOL_ID } from './constants';
import type { CorpusProfile } from './corpora';
import type { RelevanceGrade } from './ground_truth';
import { matchedLabels, relevantLabels } from './ground_truth';
import {
  distinctRelevantMessagesAtK,
  precisionAtK,
  recallOfLabels,
  trapsAtK,
  weightedPrecisionAtK,
} from './metrics';
import type { AgentTaskOutput, RetrievalTaskOutput, SemanticLogExample } from './types';

/**
 * These evaluators are written here rather than assembled from
 * `createRagEvaluators` because that factory enumerates ground truth as document
 * ids, and ours is a predicate over message text. Feeding a predicate through it
 * would mean deriving the ground truth from the task output, which would make the
 * recall denominator depend on what the system returned.
 */

interface RetrievalEvaluatorOptions {
  k?: number;
  threshold?: RelevanceGrade;
}

type RetrievalEvaluator = Evaluator<SemanticLogExample, RetrievalTaskOutput>;

const unavailable = (reason: string) => ({
  score: null,
  label: 'unavailable',
  explanation: reason,
});

export const createPrecisionEvaluator = (
  corpus: CorpusProfile,
  { k = corpus.k, threshold = corpus.relevanceThreshold }: RetrievalEvaluatorOptions = {}
): RetrievalEvaluator => ({
  name: `Precision@${k}`,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const query = expected?.query;
    if (!query) {
      return unavailable('No ground truth on the example');
    }

    const score = precisionAtK(output.patterns, query, k, threshold);
    const hits = Math.round(score * k);

    return {
      score,
      explanation: `${hits} relevant of the top ${k}`,
      metadata: { hits, k, threshold, returned: output.patterns.length },
    };
  },
});

export const createWeightedPrecisionEvaluator = (
  corpus: CorpusProfile,
  { k = corpus.k, threshold = corpus.relevanceThreshold }: RetrievalEvaluatorOptions = {}
): RetrievalEvaluator => ({
  name: `Weighted Precision@${k}`,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const query = expected?.query;
    if (!query) {
      return unavailable('No ground truth on the example');
    }

    const score = weightedPrecisionAtK(output.patterns, query, k, threshold);
    if (score === null) {
      return unavailable(`The top ${k} covers no documents`);
    }

    return {
      score,
      explanation: `${(score * 100).toFixed(1)}% of the documents behind the top ${k} are relevant`,
      metadata: { k, threshold },
    };
  },
});

export const createRecallEvaluator = (
  corpus: CorpusProfile,
  { threshold = corpus.relevanceThreshold }: RetrievalEvaluatorOptions = {}
): RetrievalEvaluator => ({
  name: 'Recall',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const query = expected?.query;
    if (!query) {
      return unavailable('No ground truth on the example');
    }

    const score = recallOfLabels(output.patterns, query, threshold);
    if (score === null) {
      return unavailable('The question has no labels at this threshold');
    }

    const expectedLabels = relevantLabels(query, threshold).length;

    return {
      score,
      explanation: `${Math.round(
        score * expectedLabels
      )} of ${expectedLabels} labelled messages found`,
      metadata: { expectedLabels, threshold },
    };
  },
});

export const createTrapEvaluator = (
  corpus: CorpusProfile,
  { k = corpus.k }: RetrievalEvaluatorOptions = {}
): RetrievalEvaluator => ({
  name: `Hard Negatives@${k}`,
  kind: 'CODE',
  direction: 'minimize',
  evaluate: async ({ output, expected }) => {
    const query = expected?.query;
    if (!query) {
      return unavailable('No ground truth on the example');
    }

    const traps = trapsAtK(output.patterns, query, k);

    return {
      score: traps,
      explanation: `${traps} lexical traps in the top ${k}`,
      metadata: { k },
    };
  },
});

export const createDistinctMessagesEvaluator = (
  corpus: CorpusProfile,
  { k = corpus.k, threshold = corpus.relevanceThreshold }: RetrievalEvaluatorOptions = {}
): RetrievalEvaluator => ({
  name: `Distinct Relevant Messages@${k}`,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const query = expected?.query;
    if (!query) {
      return unavailable('No ground truth on the example');
    }

    const distinct = distinctRelevantMessagesAtK(output.patterns, query, k, threshold);

    return {
      score: distinct,
      explanation: `${distinct} distinct relevant messages within the top ${k}`,
      metadata: { k, threshold },
    };
  },
});

export const retrievalEvaluators = (
  corpus: CorpusProfile,
  options: RetrievalEvaluatorOptions = {}
): RetrievalEvaluator[] => [
  createPrecisionEvaluator(corpus, options),
  createWeightedPrecisionEvaluator(corpus, options),
  createRecallEvaluator(corpus, options),
  createTrapEvaluator(corpus, options),
  createDistinctMessagesEvaluator(corpus, options),
];

type AgentEvaluator = Evaluator<SemanticLogExample, AgentTaskOutput>;

const toolIdsFrom = (output: AgentTaskOutput): string[] =>
  output.steps.map((step) => step.tool_id).filter((toolId): toolId is string => Boolean(toolId));

/**
 * Whether the agent reached for the log tool at all. In the baseline arm the tool
 * is not available, so this is expected to be 0 and exists to prove the arm was
 * really configured without it.
 */
export const usedLogToolEvaluator: AgentEvaluator = {
  name: 'Used Log Tool',
  kind: 'CODE',
  direction: 'neutral',
  evaluate: async ({ output }) => {
    const used = toolIdsFrom(output).includes(GET_LOGS_TOOL_ID);
    return {
      score: used ? 1 : 0,
      label: used ? 'used' : 'not used',
      metadata: { tools: toolIdsFrom(output) },
    };
  },
};

/**
 * Whether the agent chose to phrase the question semantically. This is the tool
 * selection signal the parent issue calls out: the capability only lands if the
 * model recognises that a paraphrased question needs the semantic path.
 */
export const usedSemanticFilterEvaluator: AgentEvaluator = {
  name: 'Used Semantic Filter',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const semanticCall = output.steps.find(
      (step) => step.tool_id === GET_LOGS_TOOL_ID && Boolean(step.params?.semanticFilter)
    );

    return {
      score: semanticCall ? 1 : 0,
      label: semanticCall ? 'semantic' : 'keyword',
      explanation: semanticCall
        ? `semanticFilter: "${String(semanticCall.params?.semanticFilter)}"`
        : 'The agent did not pass semanticFilter',
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
  usedSemanticFilterEvaluator,
  createCitedRelevantMessagesEvaluator(corpus),
];
