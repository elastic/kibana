/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalQuery, RelevanceGrade } from '../ground_truth';

/**
 * Everything that varies between evaluation corpora: where the data lives, the labelled
 * messages, and the queries that test them.
 * Passed to the metrics, evaluators, audit and tool client as an argument rather than imported by
 * them, so adding a corpus never means touching the evaluation logic.
 */
export interface CorpusProfile {
  /** Unique identifier used in dataset names and the env var selector. */
  readonly id: string;
  readonly description: string;

  /** Data stream or index pattern where the corpus lands. */
  readonly target: string;
  readonly timeRange: { readonly start: string; readonly end: string };

  /** Printed by the audit when the corpus is missing or unlabelled. */
  readonly setupCommand: string;

  /**
   * Classes of message in the corpus, labelled by meaning rather than vocabulary.
   * A class is stable across questions; relevance depends on the query.
   */
  readonly messageClasses: Readonly<Record<string, readonly string[]>>;

  /** The queries that test this corpus, with graded ground truth. */
  readonly queries: readonly EvalQuery[];

  /** K for the retrieval metrics. Keep close to the labelled set size so recall stays legible. */
  readonly k: number;

  /** Grade threshold; messages below this are not counted as relevant. */
  readonly relevanceThreshold: RelevanceGrade;

  /**
   * Candidate budget applied to both arms by the eval client; see `executeTool` for why it is
   * applied there rather than per arm.
   *
   * Must satisfy `k <= maxPatterns <= 20`, the ceiling on the tool's own `maxPatterns` parameter
   * and so the most this suite can ask for, whatever the service permits. `ground_truth.test.ts`
   * checks it for every registered corpus.
   * x-pack/solutions/observability/plugins/observability_agent_builder/server/tools/get_logs_semantic/tool.ts
   */
  readonly maxPatterns: number;
}

/** Flattens all labels across every message class, deduplicated. */
export const allLabels = (corpus: CorpusProfile): string[] => [
  ...new Set(Object.values(corpus.messageClasses).flatMap((labels) => [...labels])),
];
