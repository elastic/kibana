/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Direction, EvaluationResult, Evaluator } from '@kbn/evals';
import { GET_LOGS_SEMANTIC_TOOL_ID, GET_LOGS_TOOL_ID } from './constants';
import type { CorpusProfile } from './corpora';
import type { EvalQuery, RelevanceGrade } from './ground_truth';
import { matchedLabels, relevantLabels } from './ground_truth';
import {
  distinctRelevantMessagesAtK,
  recallOfLabels,
  relevantAtK,
  topRelevanceScore,
  trapsAtK,
  weightedPrecisionAtK,
} from './metrics';
import type { AgentTaskOutput, RetrievalTaskOutput, SemanticLogExample } from './types';

/**
 * These evaluators are written here rather than assembled from
 * `createRagEvaluators` because that factory's design is incompatible with
 * this suite's ground-truth model on three axes:
 *
 * 1. **The extractor cannot see the query.** `RetrievedDocsExtractor<T>` receives
 *    only the task output. This suite's relevance is a predicate over *both* sides —
 *    `gradeOf(message, query)` — which is not expressible in that signature.
 * 2. **No document identity exists.** `GroundTruth` is keyed by `index` + `_id`.
 *    The ES|QL `CATEGORIZE` + `RERANK` strategy returns log patterns, not documents,
 *    and cannot produce `_id` / `_index` at all.
 * 3. **Top-K slices a different list.** The shared factory slices the doc list; here
 *    it is the pattern list, and `recallOfLabels` deliberately applies no K cutoff
 *    because one pattern maps to 0..n labels.
 */

// ─── Private helpers ────────────────────────────────────────────────────────

export type RetrievalEvaluator = Evaluator<SemanticLogExample, RetrievalTaskOutput>;
export type AgentEvaluator = Evaluator<SemanticLogExample, AgentTaskOutput>;

interface RetrievalEvaluatorOptions {
  k?: number;
  threshold?: RelevanceGrade;
}

const unavailable = (reason: string): EvaluationResult => ({
  score: null,
  label: 'unavailable',
  explanation: reason,
});

/**
 * Factory for the five retrieval evaluators that share the same guard: if the
 * example carries no ground truth, return `unavailable` before scoring.
 */
const gradedEvaluator = (
  name: string,
  direction: Direction,
  score: (query: EvalQuery, output: RetrievalTaskOutput) => EvaluationResult
): RetrievalEvaluator => ({
  name,
  kind: 'CODE',
  direction,
  evaluate: async ({ output, expected }) => {
    const query = expected?.query;
    if (!query) {
      return unavailable('No ground truth on the example');
    }
    return score(query, output);
  },
});

// ─── Retrieval evaluators ────────────────────────────────────────────────────

export const createPrecisionEvaluator = (
  corpus: CorpusProfile,
  { k = corpus.k, threshold = corpus.relevanceThreshold }: RetrievalEvaluatorOptions = {}
): RetrievalEvaluator =>
  gradedEvaluator(`Precision@${k}`, 'maximize', (query, output) => {
    const hits = relevantAtK(output.patterns, query, k, threshold);
    const score = k <= 0 ? 0 : hits / k;
    return {
      score,
      explanation: `${hits} relevant of the top ${k}`,
      metadata: { hits, k, threshold, returned: output.patterns.length },
    };
  });

export const createWeightedPrecisionEvaluator = (
  corpus: CorpusProfile,
  { k = corpus.k, threshold = corpus.relevanceThreshold }: RetrievalEvaluatorOptions = {}
): RetrievalEvaluator =>
  gradedEvaluator(`Weighted Precision@${k}`, 'maximize', (query, output) => {
    const score = weightedPrecisionAtK(output.patterns, query, k, threshold);
    if (score === null) {
      return unavailable(`The top ${k} covers no documents`);
    }
    return {
      score,
      explanation: `${(score * 100).toFixed(1)}% of the documents behind the top ${k} are relevant`,
      metadata: { k, threshold },
    };
  });

export const createRecallEvaluator = (
  corpus: CorpusProfile,
  { threshold = corpus.relevanceThreshold }: RetrievalEvaluatorOptions = {}
): RetrievalEvaluator =>
  gradedEvaluator('Recall', 'maximize', (query, output) => {
    const score = recallOfLabels(output.patterns, query, threshold);
    if (score === null) {
      return unavailable('The question has no labels at this threshold');
    }

    const expectedLabels = relevantLabels(query, threshold).length;
    // Use the raw count from distinctRelevantMessagesAtK (all patterns, no K cutoff)
    // rather than reconstructing it from the ratio via Math.round(score * expectedLabels).
    const found = distinctRelevantMessagesAtK(
      output.patterns,
      query,
      output.patterns.length,
      threshold
    );

    return {
      score,
      explanation: `${found} of ${expectedLabels} labelled messages found`,
      metadata: { expectedLabels, threshold },
    };
  });

export const createTrapEvaluator = (
  corpus: CorpusProfile,
  { k = corpus.k }: RetrievalEvaluatorOptions = {}
): RetrievalEvaluator =>
  gradedEvaluator(`Hard Negatives@${k}`, 'minimize', (query, output) => {
    const traps = trapsAtK(output.patterns, query, k);
    return {
      score: traps,
      explanation: `${traps} lexical traps in the top ${k}`,
      metadata: { k },
    };
  });

export const createDistinctMessagesEvaluator = (
  corpus: CorpusProfile,
  { k = corpus.k, threshold = corpus.relevanceThreshold }: RetrievalEvaluatorOptions = {}
): RetrievalEvaluator =>
  gradedEvaluator(`Distinct Relevant Messages@${k}`, 'maximize', (query, output) => {
    const distinct = distinctRelevantMessagesAtK(output.patterns, query, k, threshold);
    return {
      score: distinct,
      explanation: `${distinct} distinct relevant messages within the top ${k}`,
      metadata: { k, threshold },
    };
  });

export const topRelevanceScoreEvaluator: RetrievalEvaluator = {
  name: 'Top Relevance Score',
  kind: 'CODE',
  direction: 'neutral',
  evaluate: async ({ output }) => {
    const score = topRelevanceScore(output.patterns);

    if (score === null) {
      return unavailable('No relevanceScore available (keyword-only strategy or empty result)');
    }

    return {
      score,
      explanation: `Top reranker score: ${score.toFixed(2)}`,
      metadata: { topScore: score },
    };
  },
};

export const retrievalEvaluators = (
  corpus: CorpusProfile,
  options: RetrievalEvaluatorOptions = {}
): RetrievalEvaluator[] => [
  createPrecisionEvaluator(corpus, options),
  createWeightedPrecisionEvaluator(corpus, options),
  createRecallEvaluator(corpus, options),
  createTrapEvaluator(corpus, options),
  createDistinctMessagesEvaluator(corpus, options),
  topRelevanceScoreEvaluator,
];

// ─── Agent evaluators ────────────────────────────────────────────────────────

const toolIdsFrom = (output: AgentTaskOutput): string[] =>
  output.steps.map((step) => step.tool_id).filter((toolId): toolId is string => Boolean(toolId));

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
