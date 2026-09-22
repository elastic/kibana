/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalQuery, RelevanceGrade } from '../ground_truth';

/**
 * A corpus profile bundles the data that varies between evaluation corpora:
 * where the data lives, the labelled messages, and the queries that test them.
 *
 * The evaluation logic (metrics, evaluators, audit, tool client) receives this
 * profile as an argument rather than importing corpus-specific constants, which
 * makes switching corpora a matter of selecting a different profile at runtime.
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
   * Uniform candidate budget applied to both the semantic and keyword arms by the
   * eval client after parsing. The semantic tool is server-side limited to this
   * value; the keyword tool returns up to ~60 categories (two `categorize_text`
   * aggs at `size: 30`) and is capped client-side so Recall cannot be inflated by
   * giving one arm more surface area.
   *
   * Must satisfy `k <= maxPatterns <= 20` (20 is the `get_logs_semantic` schema
   * ceiling). Validated by `ground_truth.test.ts` for every registered corpus.
   */
  readonly maxPatterns: number;
}

/**
 * Flattens all labels across every message class, deduplicated. Used by the
 * corpus audit to verify that each label is actually present.
 */
export const allLabels = (corpus: CorpusProfile): string[] => [
  ...new Set(Object.values(corpus.messageClasses).flatMap((labels) => [...labels])),
];
