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
   * Number of documents sharing the pattern in **the query time window,
   * at population scale** (not raw sampled counts). Strategies MUST honour this
   * contract. A strategy that returns a lifetime, rolling counter, or raw sampled
   * `doc_count` inflates `weightedPrecisionAtK` and violates the invariant checked
   * by `countSanityEvaluator`.
   */
  count: number;
  /** Reranker relevance score (logit). Only present for semantic strategies. */
  relevanceScore?: number;
}

/** Output of the retrieval arm: ranked patterns, with no model in the loop. */
export interface RetrievalTaskOutput {
  patterns: RetrievedPattern[];
  totalCount: number;
  warnings: string[];
  /** Wall-clock time from fetch start to parsed result, in milliseconds. */
  latencyMs: number;
  /**
   * Number of patterns returned by the tool before the eval client applied the
   * `maxPatterns` cap. Equal to `patterns.length` when no cap was applied.
   * Surfaced in evaluator metadata so the cap is visible in results.
   */
  returnedBeforeCap: number;
}
