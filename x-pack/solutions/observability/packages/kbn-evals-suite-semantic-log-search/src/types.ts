/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@kbn/evals';
import type { EvalQuery } from './ground_truth';

/**
 * The arms compared. Every arm answers the same questions over the same corpus; they differ only
 * in what the caller is allowed to use.
 */
export const ARMS = {
  /** Agent Builder with no log-specific tool. What a user gets today. */
  baseline: 'baseline',
  /** `get_logs` driven by keyword filters only, the funnel workflow that ships now. */
  keyword: 'keyword',
  /**
   * `get_log_groups`, given the same question as the other arms through the only query input it
   * has, a KQL filter. It returns the semantic arm's grouped shape ordered by frequency, so
   * against `keyword` it isolates the output shape and against `semantic` it isolates the ranking.
   * Retrieval only, because the tool has no semantic parameter for an agent to drive.
   */
  groups: 'groups',
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
