/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalQuery, RelevanceGrade } from './ground_truth';
import { gradeOf, isTrap, matchedLabels, relevantLabels } from './ground_truth';
import type { RetrievedPattern } from './types';

// Re-export so consumers that imported RetrievedPattern from this module continue to work.
export type { RetrievedPattern } from './types';

// ─── Private helpers ────────────────────────────────────────────────────────

/** Distinct labels from `expected` matched anywhere across all `patterns`. */
const distinctMatchedLabels = (
  patterns: readonly RetrievedPattern[],
  expected: readonly string[]
): Set<string> => new Set(patterns.flatMap(({ message }) => matchedLabels(message, expected)));

// ─── Public functions ────────────────────────────────────────────────────────

/**
 * Number of distinct relevant pattern matches within the top K.
 *
 * This is the raw count underlying both `precisionAtK` (which divides by K)
 * and the precision evaluator's `hits` metadata. Keeping it separate avoids
 * reconstructing the integer from the ratio via a round-trip through floats.
 */
export const relevantAtK = (
  patterns: readonly RetrievedPattern[],
  query: EvalQuery,
  k: number,
  threshold: RelevanceGrade
): number =>
  patterns.slice(0, k).filter((candidate) => gradeOf(candidate.message, query) >= threshold).length;

/**
 * Precision@K = relevant results in the top K, divided by K.
 *
 * The denominator is K rather than the number of results returned, so a strategy
 * cannot inflate its score by returning fewer results.
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
 * Precision@K weighted by how many documents each pattern covers.
 *
 * Plain precision treats a pattern covering 40.000 documents and one covering 50
 * as equal. This states what fraction of the documents behind the top K are
 * relevant, which is closer to what a user reading the results experiences.
 * Returns null when the top K covers no documents at all.
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
 * Recall over the labelled set: how many of the distinct relevant labels appear
 * anywhere in the results.
 *
 * This is recall against ground truth, not against the corpus. It is comparable
 * between arms; it is not an absolute measure of coverage, because the
 * denominator is the set of labels we wrote rather than every relevant message
 * that exists.
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
 * Number of lexical traps in the top K: results that share vocabulary with the
 * question but do not answer it. Lower is better.
 */
export const trapsAtK = (
  patterns: readonly RetrievedPattern[],
  query: EvalQuery,
  k: number
): number => patterns.slice(0, k).filter((candidate) => isTrap(candidate.message, query)).length;

/**
 * Distinct relevant messages surfaced within the top K.
 *
 * This is the metric the acceptance criteria in the parent issue are stated on,
 * because deduplication is the point: returning the same relevant message twenty
 * times is not the same as returning twenty relevant messages.
 */
export const distinctRelevantMessagesAtK = (
  patterns: readonly RetrievedPattern[],
  query: EvalQuery,
  k: number,
  threshold: RelevanceGrade
): number => distinctMatchedLabels(patterns.slice(0, k), relevantLabels(query, threshold)).size;

/**
 * Top relevance score from the reranker.
 *
 * Returns null when none of the patterns have a relevanceScore (keyword-only strategies).
 * This metric crossed with Recall separates two failure modes: low recall with high score
 * means the reranker ordered poorly; low recall with negative score means the relevant
 * patterns never reached the ranking window (candidate selection problem).
 */
export const topRelevanceScore = (patterns: readonly RetrievedPattern[]): number | null =>
  patterns[0]?.relevanceScore ?? null;
