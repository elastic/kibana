/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * One result as returned by the retrieval arm: a recurring log pattern, the
 * sample message that represents it, and how many documents it covers.
 */
export interface RetrievedPattern {
  /** The template text or, where `pattern_text` is mapped, its hash. */
  pattern: string;
  /** The representative message; this is what ground truth labels match against. */
  message: string;
  /**
   * Number of documents sharing the pattern in **the query time window**.
   * Strategies MUST honour this contract. A strategy that returns a lifetime or
   * rolling counter inflates `weightedPrecisionAtK` and violates the invariant
   * checked by `countSanityEvaluator`.
   */
  count: number;
  /** Reranker relevance score (logit). Only present for semantic strategies. */
  relevanceScore?: number;
  /**
   * Stable dictionary entry identifier. Only populated by indexed strategies (M2).
   * Runtime `CATEGORIZE` strategies leave this undefined.
   */
  patternId?: string;
  /**
   * ISO timestamp of the earliest occurrence. Only populated by indexed strategies
   * that maintain a persistent dictionary with time bounds.
   */
  firstSeen?: string;
  /**
   * ISO timestamp of the latest occurrence. Only populated by indexed strategies
   * that maintain a persistent dictionary with time bounds.
   */
  lastSeen?: string;
}

/** Output of the retrieval arm: ranked patterns, with no model in the loop. */
export interface RetrievalTaskOutput {
  patterns: RetrievedPattern[];
  totalCount: number;
  warnings: string[];
  error?: string;
  /** Wall-clock time from fetch start to parsed result, in milliseconds. */
  latencyMs: number;
}
