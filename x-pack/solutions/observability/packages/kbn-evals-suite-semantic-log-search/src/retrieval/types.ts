/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * One result from the retrieval arm: a recurring log pattern, the sample message that represents
 * it, and how many documents it covers.
 */
export interface RetrievedPattern {
  /** The template text or, where `pattern_text` is mapped, its hash. */
  pattern: string;
  /** The representative message; this is what ground truth labels match against. */
  message: string;
  /**
   * Documents sharing the pattern within the query time window, at population scale.
   * This is a contract on every strategy, not a description of one: a lifetime count, a rolling
   * counter or a raw sampled `doc_count` all inflate the document-weighted metrics. Enforced by
   * `countSanityEvaluator`.
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
   * Patterns the tool returned before the eval client applied `maxPatterns`, reported in
   * evaluator metadata so a score is readable against how much was discarded to produce it.
   */
  returnedBeforeCap: number;
  /**
   * Groups dropped for not being log groups, on the groups arm only. Absent elsewhere.
   * A non-zero value means APM span exceptions reached the result, which both dilutes the
   * comparison and makes the tool's own ordering unreliable, since it truncates before sorting.
   */
  droppedNonLogGroups?: number;
}
