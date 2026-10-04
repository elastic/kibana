/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalQuery, RelevanceGrade } from '../ground_truth';
import { gradeOf, isTrap, matchedLabels, relevantLabels } from '../ground_truth';
import type { RetrievedPattern } from './types';

/** Distinct labels from `expected` matched anywhere across all `patterns`. */
const distinctMatchedLabels = (
  patterns: readonly RetrievedPattern[],
  expected: readonly string[]
): Set<string> => new Set(patterns.flatMap(({ message }) => matchedLabels(message, expected)));

/**
 * Number of results in the top K that are relevant. Counts patterns, not labels, so two
 * patterns carrying the same label count twice; `distinctRelevantMessagesAtK` is the deduplicated
 * form. Exported separately from `precisionAtK` so a caller reporting a hit count does not have to
 * recover the integer from the ratio.
 */
export const relevantAtK = (
  patterns: readonly RetrievedPattern[],
  query: EvalQuery,
  k: number,
  threshold: RelevanceGrade
): number =>
  patterns.slice(0, k).filter((candidate) => gradeOf(candidate.message, query) >= threshold).length;

/**
 * Precision@K: relevant results in the top K, divided by K.
 * The denominator is K rather than the number of results returned, so a strategy cannot inflate
 * its score by returning fewer results.
 */
export const precisionAtK = (
  patterns: readonly RetrievedPattern[],
  query: EvalQuery,
  k: number,
  threshold: RelevanceGrade
): number => {
  if (k <= 0) {
    return 0;
  }
  return relevantAtK(patterns, query, k, threshold) / k;
};

/**
 * Precision@K weighted by how many documents each pattern covers, or null when the top K covers
 * no documents. Plain precision treats a pattern covering 40,000 documents and one covering 50 as
 * equal; this reports what fraction of the documents behind the top K are relevant, which is
 * closer to what a user reading the results sees. Assumes `count` is at population scale, an
 * invariant `countSanityEvaluator` checks.
 */
export const weightedPrecisionAtK = (
  patterns: readonly RetrievedPattern[],
  query: EvalQuery,
  k: number,
  threshold: RelevanceGrade
): number | null => {
  const topK = patterns.slice(0, k);
  const totalDocuments = topK.reduce((total, candidate) => total + candidate.count, 0);

  if (totalDocuments <= 0) {
    return null;
  }

  const relevantDocuments = topK
    .filter((candidate) => gradeOf(candidate.message, query) >= threshold)
    .reduce((total, candidate) => total + candidate.count, 0);

  return relevantDocuments / totalDocuments;
};

/**
 * Recall over the labelled set: how many of the distinct relevant labels appear anywhere in the
 * results, with no K cutoff because one pattern can carry several labels.
 * The denominator is the set of labels the corpus declares, not every relevant message that
 * exists, so this is comparable between arms but is not an absolute coverage figure.
 */
export const recallOfLabels = (
  patterns: readonly RetrievedPattern[],
  query: EvalQuery,
  threshold: RelevanceGrade
): number | null => {
  const expected = relevantLabels(query, threshold);
  if (expected.length === 0) {
    return null;
  }

  return distinctMatchedLabels(patterns, expected).size / expected.length;
};

/**
 * Number of lexical traps in the top K: results that share vocabulary with the question but do
 * not answer it. Lower is better.
 */
export const trapsAtK = (
  patterns: readonly RetrievedPattern[],
  query: EvalQuery,
  k: number
): number => patterns.slice(0, k).filter((candidate) => isTrap(candidate.message, query)).length;

/**
 * Distinct relevant messages surfaced within the top K. The acceptance criteria are stated on
 * this rather than on `relevantAtK` because deduplication is the point: returning the same
 * relevant message twenty times is not the same as returning twenty relevant messages.
 */
export const distinctRelevantMessagesAtK = (
  patterns: readonly RetrievedPattern[],
  query: EvalQuery,
  k: number,
  threshold: RelevanceGrade
): number => distinctMatchedLabels(patterns.slice(0, k), relevantLabels(query, threshold)).size;

/**
 * Top relevance score from the reranker, or null when no pattern carries one (keyword-only
 * strategies).
 * Crossed with Recall this separates two failure modes: low recall with a high score means the
 * reranker ordered poorly, while low recall with a negative score means the relevant patterns
 * never reached the ranking window, which is a candidate-selection problem instead.
 */
export const topRelevanceScore = (patterns: readonly RetrievedPattern[]): number | null =>
  patterns[0]?.relevanceScore ?? null;

/**
 * R-Precision: relevant results in the top R divided by R, where R is the number of relevant
 * labels the query declares at this threshold. Returns null when there are none.
 *
 * Normalising by R rather than by a fixed K is what makes `kind: 'literal'` queries scorable at
 * all: with one or two correct answers, Precision@10 cannot reach the 1.0 that the parent issue's
 * "literal queries stay at P = 1.0" criterion asks for.
 * https://github.com/elastic/observability-dev/issues/6117
 */
export const rPrecision = (
  patterns: readonly RetrievedPattern[],
  query: EvalQuery,
  threshold: RelevanceGrade
): number | null => {
  const r = relevantLabels(query, threshold).length;
  if (r === 0) return null;
  return relevantAtK(patterns, query, r, threshold) / r;
};

/**
 * Normalised Discounted Cumulative Gain at K, or null when the ideal DCG would be 0.
 * The gain is `gradeOf(message, query)` and the ideal is built from the query's own graded list,
 * so the score reflects both coverage and ordering rather than coverage alone.
 */
export const ndcgAtK = (
  patterns: readonly RetrievedPattern[],
  query: EvalQuery,
  k: number,
  threshold: RelevanceGrade
): number | null => {
  // The +2 converts the 0-indexed position into the 1-indexed rank the DCG discount is defined on.
  const gainLog2 = (rank: number) => Math.log2(rank + 2);

  const dcg = patterns
    .slice(0, k)
    .reduce((sum, candidate, idx) => sum + gradeOf(candidate.message, query) / gainLog2(idx), 0);

  // Build ideal ranking: grade-2 labels first, then grade-1, fill the rest with 0.
  const idealGains = query.graded
    .slice()
    .sort((a, b) => b.grade - a.grade)
    .flatMap(({ grade, matches }) => matches.map(() => grade as number))
    .slice(0, k);

  const idealDcg = idealGains.reduce((sum, gain, idx) => sum + gain / gainLog2(idx), 0);

  if (idealDcg === 0) return null;
  return dcg / idealDcg;
};

/**
 * Reciprocal rank of the first result at or above `threshold`, over the full list rather than the
 * top K. Returns 0 when no relevant result appears at all.
 */
export const reciprocalRank = (
  patterns: readonly RetrievedPattern[],
  query: EvalQuery,
  threshold: RelevanceGrade
): number => {
  const rank = patterns.findIndex((candidate) => gradeOf(candidate.message, query) >= threshold);
  return rank === -1 ? 0 : 1 / (rank + 1);
};
