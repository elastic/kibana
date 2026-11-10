/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_SCORES_PER_QUERY } from '@kbn/evals-common';

/**
 * Throws before any investigation starts when a run would write more scores than the score API
 * returns, since the eval's final score check could then never pass.
 */
export const assertScoresWithinQueryLimit = ({
  examples,
  repetitions,
  evaluators,
}: {
  examples: number;
  repetitions: number;
  evaluators: number;
}): void => {
  const scores = examples * repetitions * evaluators;
  if (scores <= MAX_SCORES_PER_QUERY) return;
  const examplesThatFit = Math.floor(MAX_SCORES_PER_QUERY / (repetitions * evaluators));
  throw new Error(
    `${examples} examples × ${repetitions} repetitions × ${evaluators} evaluators would write ` +
      `${scores} scores, more than the ${MAX_SCORES_PER_QUERY} the score API returns, so the run ` +
      `could not be verified. Run at most ${examplesThatFit} examples at a time, for example ` +
      `with NIGHTSHIFT_ORCA_SLICE=<index>/<count>.`
  );
};
