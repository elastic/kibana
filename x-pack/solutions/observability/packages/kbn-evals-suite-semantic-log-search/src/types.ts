/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@kbn/evals';
import type { EvalQuery } from './ground_truth';

/**
 * One result as returned by the retrieval arm: a recurring log pattern, the
 * sample message that represents it, and how many documents it covers.
 */
export interface RetrievedPattern {
  /** The template text or, where `pattern_text` is mapped, its hash. */
  pattern: string;
  /** The representative message; this is what ground truth labels match against. */
  message: string;
  /** Number of documents sharing the pattern in the time window. */
  count: number;
  /** Reranker relevance score (logit). Only present for semantic strategies. */
  relevanceScore?: number;
}

/**
 * The three arms compared. Every arm answers the same questions over the same
 * corpus; they differ only in what the caller is allowed to use.
 */
export const ARMS = {
  /** Agent Builder with no log-specific tool. What a user gets today. */
  baseline: 'baseline',
  /** `get_logs` driven by keyword filters only, the funnel workflow that ships now. */
  keyword: 'keyword',
  /** `get_logs_semantic`, the capability under test. */
  semantic: 'semantic',
} as const;

export type Arm = (typeof ARMS)[keyof typeof ARMS];

/** Ground truth for an example is the query itself: its graded labels and traps. */
export type SemanticLogExample = Example<
  { question: string; queryId: string },
  { query: EvalQuery },
  { kind: EvalQuery['kind']; arm: Arm }
>;

/** Output of the retrieval arm: ranked patterns, with no model in the loop. */
export interface RetrievalTaskOutput {
  patterns: RetrievedPattern[];
  totalCount: number;
  warnings: string[];
  error?: string;
}

/** Output of an agent arm: the prose answer plus the steps that produced it. */
export interface AgentTaskOutput {
  answer: string;
  steps: Array<{ tool_id?: string; params?: Record<string, unknown>; [key: string]: unknown }>;
  traceId?: string;
}
