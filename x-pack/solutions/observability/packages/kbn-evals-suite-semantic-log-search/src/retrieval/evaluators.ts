/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Direction, EvaluationResult, Evaluator } from '@kbn/evals';
import type { CorpusProfile } from '../corpora';
import type { EvalQuery, RelevanceGrade } from '../ground_truth';
import { relevantLabels } from '../ground_truth';
import type { SemanticLogExample } from '../types';
import {
  distinctRelevantMessagesAtK,
  recallOfLabels,
  relevantAtK,
  topRelevanceScore,
  trapsAtK,
  weightedPrecisionAtK,
} from './metrics';
import type { RetrievalTaskOutput } from './types';

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

interface RetrievalEvaluatorOptions {
  k?: number;
  threshold?: RelevanceGrade;
}

/** Duplicated from agent/evaluators.ts — a deliberate 5-line copy to avoid a shared module. */
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
