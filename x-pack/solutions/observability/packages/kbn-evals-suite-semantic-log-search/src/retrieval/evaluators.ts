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
  ndcgAtK,
  precisionAtK,
  rPrecision,
  recallOfLabels,
  reciprocalRank,
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
 * Factory for retrieval evaluators that share the same guard: if the
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
    const score = precisionAtK(output.patterns, query, k, threshold);
    return {
      score,
      explanation: `${hits} relevant of the top ${k}`,
      metadata: { hits, k, threshold, returned: output.patterns.length, returnedBeforeCap: output.returnedBeforeCap },
    };
  });

export const createWeightedPrecisionEvaluator = (
  corpus: CorpusProfile,
  { k = corpus.k, threshold = corpus.relevanceThreshold }: RetrievalEvaluatorOptions = {}
): RetrievalEvaluator =>
  gradedEvaluator(`Weighted Precision@${k}`, 'maximize', (query, output) => {
    // Guard: if pattern counts are on a sampled scale (sum << totalCount despite
    // exhaustive results), the weighted metric compares incommensurable scales.
    // This happens when get_logs returns raw sampled doc_count without /p correction.
    // The threshold is 10% — below that, the counts are almost certainly sampled.
    const patternCountSum = output.patterns.reduce((sum, p) => sum + p.count, 0);
    if (
      output.totalCount > 0 &&
      patternCountSum < output.totalCount * 0.1 &&
      output.patterns.length >= corpus.maxPatterns
    ) {
      return unavailable(
        `Pattern counts (sum=${patternCountSum}) appear to be on a sampled scale ` +
          `relative to totalCount (${output.totalCount}). ` +
          `Weighted Precision requires population-scale counts.`
      );
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

/**
 * R-Precision: relevant results in the top R / R, where R = number of relevant
 * labels for the query. Unlike Precision@K, the denominator is the number of
 * correct answers rather than a fixed K, so queries with few correct answers
 * (including `kind: 'literal'` queries) can reach 1.0.
 */
export const createRPrecisionEvaluator = (
  corpus: CorpusProfile,
  { threshold = corpus.relevanceThreshold }: RetrievalEvaluatorOptions = {}
): RetrievalEvaluator =>
  gradedEvaluator('R-Precision', 'maximize', (query, output) => {
    const score = rPrecision(output.patterns, query, threshold);
    if (score === null) {
      return unavailable('The question has no relevant labels');
    }
    return {
      score,
      explanation: `${(score * 100).toFixed(1)}% of the relevant answers found at rank R`,
      metadata: { threshold },
    };
  });

/**
 * nDCG@K: normalised Discounted Cumulative Gain. Uses graded relevance (grade 2
 * > grade 1 > 0), so it rewards returning the most-relevant answers first.
 */
export const createNdcgEvaluator = (
  corpus: CorpusProfile,
  { k = corpus.k, threshold = corpus.relevanceThreshold }: RetrievalEvaluatorOptions = {}
): RetrievalEvaluator =>
  gradedEvaluator(`nDCG@${k}`, 'maximize', (query, output) => {
    const score = ndcgAtK(output.patterns, query, k, threshold);
    if (score === null) {
      return unavailable('The question has no relevant labels');
    }
    return {
      score,
      explanation: `nDCG@${k}: ${score.toFixed(3)}`,
      metadata: { k, threshold },
    };
  });

/**
 * Mean Reciprocal Rank (one query): reciprocal of the rank of the first
 * relevant result. 1.0 when the first result is relevant, 0.5 for second, etc.
 */
export const createMrrEvaluator = (
  corpus: CorpusProfile,
  { threshold = corpus.relevanceThreshold }: RetrievalEvaluatorOptions = {}
): RetrievalEvaluator =>
  gradedEvaluator('MRR', 'maximize', (query, output) => {
    const score = reciprocalRank(output.patterns, query, threshold);
    return {
      score,
      explanation: score > 0 ? `First relevant result at rank ${Math.round(1 / score)}` : 'No relevant result found',
      metadata: { threshold },
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

/**
 * Records end-to-end retrieval latency in milliseconds.
 *
 * This is the decisive measurement for M2 (indexed dictionary vs runtime
 * CATEGORIZE+RERANK): the retrieval layer is where the cost moves, not the agent
 * layer where LLM latency dominates. Minimize.
 */
export const retrievalLatencyEvaluator: RetrievalEvaluator = {
  name: 'Retrieval Latency',
  kind: 'CODE',
  direction: 'minimize',
  evaluate: async ({ output }) => ({
    score: output.latencyMs,
    explanation: `${output.latencyMs}ms fetch-to-parsed`,
    metadata: { latencyMs: output.latencyMs },
  }),
};

/**
 * Asserts that the sum of pattern document counts does not exceed the corpus
 * document count for the query window.
 *
 * `weightedPrecisionAtK` assumes `count` means "documents in the query window,
 * at population scale". A strategy that returns a lifetime or rolling counter
 * violates this and inflates the metric silently. The low-side guard catches
 * strategies that return raw sampled doc_count (sum << totalCount).
 *
 * Bind the corpus `totalDocuments` from `auditCorpus` via closure in `beforeAll`:
 *
 * ```ts
 * const countSanity = countSanityEvaluator(audit.totalDocuments);
 * await executorClient.runExperiment({ ... }, [...retrievalEvaluators(corpus), countSanity]);
 * ```
 */
export const countSanityEvaluator = (totalDocuments: number): RetrievalEvaluator => ({
  name: 'Count Sanity',
  kind: 'CODE',
  direction: 'minimize',
  evaluate: async ({ output }) => {
    const patternCountSum = output.patterns.reduce((sum, p) => sum + p.count, 0);

    if (output.totalCount > totalDocuments) {
      return {
        score: 1,
        explanation:
          `totalCount (${output.totalCount}) exceeds corpus documents (${totalDocuments}) ` +
          `— the strategy may be returning lifetime counters, not window counts`,
        metadata: { totalCount: output.totalCount, totalDocuments, patternCountSum },
      };
    }

    // Low-side guard: if the summed pattern counts are implausibly small relative
    // to totalCount (< 10%) while the result list is full, the counts are likely
    // raw sampled values (not /p-normalised). weightedPrecisionAtK will be
    // inaccurate in this case and is separately guarded in that evaluator.
    if (
      output.totalCount > 0 &&
      patternCountSum < output.totalCount * 0.1 &&
      output.patterns.length >= 1
    ) {
      return {
        score: 1,
        explanation:
          `Pattern count sum (${patternCountSum}) is < 10% of totalCount (${output.totalCount}) ` +
          `— counts may be raw sampled doc_count without /probability normalisation`,
        metadata: { totalCount: output.totalCount, totalDocuments, patternCountSum },
      };
    }

    return {
      score: 0,
      explanation: `totalCount (${output.totalCount}) within corpus (${totalDocuments} docs)`,
      metadata: { totalCount: output.totalCount, totalDocuments, patternCountSum },
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
  createRPrecisionEvaluator(corpus, options),
  createNdcgEvaluator(corpus, options),
  createMrrEvaluator(corpus, options),
  topRelevanceScoreEvaluator,
  retrievalLatencyEvaluator,
];
