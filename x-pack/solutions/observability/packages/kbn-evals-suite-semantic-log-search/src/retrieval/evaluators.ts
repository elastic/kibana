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

// These evaluators are hand-written rather than assembled from `createRagEvaluators` because that
// factory is typed around document identity, which this suite does not have:
// `RetrievedDocsExtractor<T>` receives only the task output, so it cannot express a relevance
// predicate over both sides (`gradeOf(message, query)`), and `GroundTruth` is keyed by index and
// document id, which `CATEGORIZE` + `RERANK` cannot produce because it returns patterns.
// https://github.com/elastic/kibana/blob/971d7d52c49d/x-pack/platform/packages/shared/kbn-evals/src/evaluators/rag/types.ts#L22
// https://github.com/elastic/kibana/blob/971d7d52c49d/x-pack/platform/packages/shared/kbn-evals/src/evaluators/rag/types.ts#L28

export type RetrievalEvaluator = Evaluator<SemanticLogExample, RetrievalTaskOutput>;

interface RetrievalEvaluatorOptions {
  k?: number;
  threshold?: RelevanceGrade;
}

/**
 * Below the point where the summed pattern counts stop being credible as population-scale
 * figures, relative to the documents the query matched. A strategy returning raw sampled
 * `doc_count` lands here, and the document-weighted metrics are meaningless on that scale.
 */
const MIN_POPULATION_SCALE_RATIO = 0.1;

/** Duplicated in agent/evaluators.ts; copied rather than shared, to avoid a five-line module. */
const unavailable = (reason: string): EvaluationResult => ({
  score: null,
  label: 'unavailable',
  explanation: reason,
});

/** Applies the shared guard: an example carrying no ground truth is `unavailable`, not zero. */
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
      metadata: {
        hits,
        k,
        threshold,
        returned: output.patterns.length,
        returnedBeforeCap: output.returnedBeforeCap,
        ...(output.droppedNonLogGroups !== undefined
          ? { droppedNonLogGroups: output.droppedNonLogGroups }
          : {}),
      },
    };
  });

/**
 * Precision weighted by how many documents each returned pattern covers.
 *
 * Read this as a diagnostic, never as a target. It rewards covering log volume, so it structurally
 * penalises the behaviour the semantic strategy exists for: a relevant rare pattern contributes
 * almost nothing to the numerator, while one irrelevant high-frequency pattern loads the
 * denominator. Tuning against it would optimise for frequency, which is what the keyword arm
 * already does.
 */
export const createWeightedPrecisionEvaluator = (
  corpus: CorpusProfile,
  { k = corpus.k, threshold = corpus.relevanceThreshold }: RetrievalEvaluatorOptions = {}
): RetrievalEvaluator =>
  gradedEvaluator(`Weighted Precision@${k}`, 'maximize', (query, output) => {
    // Declining to score beats scoring incommensurable scales: a full result list whose counts sum
    // to a fraction of the documents the query matched means the counts are sampled, not
    // normalised. Compared against `totalCount` and not the corpus size, for the reason given on
    // the equivalent guard in `countSanityEvaluator`.
    const patternCountSum = output.patterns.reduce((sum, p) => sum + p.count, 0);
    if (
      output.totalCount > 0 &&
      patternCountSum < output.totalCount * MIN_POPULATION_SCALE_RATIO &&
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
    // Recounted rather than recovered from `score * expectedLabels`, so the reported figure is
    // never a rounded float.
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

export const createMrrEvaluator = (
  corpus: CorpusProfile,
  { threshold = corpus.relevanceThreshold }: RetrievalEvaluatorOptions = {}
): RetrievalEvaluator =>
  gradedEvaluator('MRR', 'maximize', (query, output) => {
    const score = reciprocalRank(output.patterns, query, threshold);
    return {
      score,
      explanation:
        score > 0
          ? `First relevant result at rank ${Math.round(1 / score)}`
          : 'No relevant result found',
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
 * Measured in this arm rather than the agent arm because the retrieval layer is where a change of
 * strategy moves the cost, while the agent arm is dominated by model latency.
 *
 * Not comparable between runs, and repeating a run makes it worse rather than better. The
 * reranker deployment caches the (query, document) pairs it scores, and this suite asks the same
 * questions over the same corpus every time, so each run is faster than the last for no reason
 * related to retrieval: 8,316 ms, then 2,315 ms, then 72 ms were all measured on one corpus with
 * identical quality scores, against roughly 10.9 s for a question the cluster had never seen.
 *
 * Two further conditions: it is only comparable at equal concurrency, since the reranker saturates
 * at one in-flight request and the specs pin concurrency to 1 for that reason; and it is not
 * normalised by candidate count, which the service does not report, so a corpus yielding more
 * patterns costs proportionally more.
 *
 * See SETUP.md, "Measuring latency properly", before drawing a conclusion from this number.
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
 * Checks the `count` contract that the document-weighted metrics rest on: documents in the query
 * window, at population scale. Scores 1 on a violation, so a run that breaks the contract shows
 * up in the results instead of silently inflating Weighted Precision. The high side catches
 * lifetime or rolling counters, the low side catches raw sampled counts.
 *
 * The low side is only meaningful for a strategy whose `totalCount` is independent of the patterns
 * it returns, which is true of `get_logs` (matched documents) but not of `get_logs_semantic`,
 * where `totalCount` is the sum of the returned counts and the comparison degenerates to
 * `sum < sum * ratio`. Detecting un-normalised sampled counts on the semantic arm needs the
 * probe total from the service, which it does not report; until then that half is inert there
 * rather than wrong. Do not substitute the corpus size: see the comment on the guard below.
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
          `totalCount (${output.totalCount}) exceeds corpus documents (${totalDocuments}): ` +
          `the strategy may be returning lifetime counters, not window counts`,
        metadata: { totalCount: output.totalCount, totalDocuments, patternCountSum },
      };
    }

    // Compared against `totalCount`, the documents the query matched, and deliberately not against
    // the corpus size: a narrow question legitimately matches a small fraction of the corpus, and
    // comparing to the corpus reports every such query as broken. Measured against the audited
    // 2,611-document corpus, `message: hikaripool` matched 12 documents whose counts summed to
    // exactly 12, correct and complete, yet a corpus-relative guard flags it.
    //
    // Wider than the guard in `createWeightedPrecisionEvaluator`, which only reports on a full
    // result list: any non-empty list on a sampled scale is reported here.
    if (
      output.totalCount > 0 &&
      patternCountSum < output.totalCount * MIN_POPULATION_SCALE_RATIO &&
      output.patterns.length >= 1
    ) {
      return {
        score: 1,
        explanation:
          `Pattern count sum (${patternCountSum}) is under ${MIN_POPULATION_SCALE_RATIO * 100}% ` +
          `of totalCount (${output.totalCount}): counts may be raw sampled doc_count, ` +
          `not normalised by the sampling probability`,
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
