/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Words carrying no retrieval signal in a log question. Kept deliberately short:
 * the keyword arm should be a fair stand-in for what a user would type, not a
 * tuned query builder.
 */
const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'be',
  'can',
  'cannot',
  'for',
  'from',
  'has',
  'have',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'one',
  'or',
  'that',
  'the',
  'this',
  'to',
  'was',
  'were',
  'with',
]);

/**
 * Turns a natural language question into the KQL a user would plausibly write for
 * it: an OR over the content words, matched against `message`.
 *
 * This is what the keyword arm searches with. Without it the arm would either not
 * use the question at all (ranking purely by frequency) or need a hand-written
 * filter per question, and neither is a fair comparison.
 */
export const toKeywordFilter = (question: string): string | undefined => {
  const terms = question
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((term) => term.length > 1 && !STOP_WORDS.has(term));

  if (terms.length === 0) {
    return undefined;
  }

  return terms.map((term) => `message: ${term}`).join(' or ');
};
