/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Relevance is expressed as a case-insensitive substring of a message, not as a document id,
// because the strategies return patterns and `CATEGORIZE` + `RERANK` cannot produce an id at all.
// Every message containing a label carries that label's grade.
// Only the types and the pure predicates live here; the labels and queries they run over belong
// to a corpus profile under `corpora/`.

/** 2 answers the question, 1 is related but weaker, 0 does not answer it. */
export type RelevanceGrade = 0 | 1 | 2;

interface GradedMatches {
  readonly grade: 1 | 2;
  readonly matches: readonly string[];
}

export interface EvalQuery {
  readonly id: string;
  /** `literal` questions exist as a non-regression check on keyword search. */
  readonly kind: 'semantic' | 'literal';
  readonly question: string;
  /** Messages that answer the question, by grade. Anything unlisted grades 0. */
  readonly graded: readonly GradedMatches[];
  /** Lexical traps: share vocabulary with the question but do not answer it. */
  readonly traps: readonly string[];
  readonly note: string;
}

const containsLabel = (message: string, label: string): boolean =>
  message.toLowerCase().includes(label.toLowerCase());

/** Returns the labels from `labels` that the message carries. */
export const matchedLabels = (message: string, labels: readonly string[]): string[] =>
  labels.filter((label) => containsLabel(message, label));

/**
 * Grades a message against a query, taking the highest grade when it carries labels of several,
 * so a line that is both a warning and a failure counts as a failure.
 */
export const gradeOf = (message: string, query: EvalQuery): RelevanceGrade => {
  let best: RelevanceGrade = 0;
  for (const { grade, matches } of query.graded) {
    if (grade > best && matches.some((label) => containsLabel(message, label))) {
      best = grade;
    }
  }
  return best;
};

/**
 * True when the message is a lexical trap for this query.
 * Scored separately from precision because a trap is a specific kind of wrong answer: the kind
 * keyword search is expected to rank highly.
 */
export const isTrap = (message: string, query: EvalQuery): boolean =>
  query.traps.some((label) => containsLabel(message, label));

/** The labels that count as relevant for a query at a given threshold, deduplicated. */
export const relevantLabels = (query: EvalQuery, threshold: RelevanceGrade): readonly string[] => [
  ...new Set(
    query.graded.filter(({ grade }) => grade >= threshold).flatMap(({ matches }) => [...matches])
  ),
];
