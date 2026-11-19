/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KIQueryGenerationEvaluator } from './types';
import { getQueriesFromOutput, getQueryAttempts } from './types';

/**
 * Scores 1 when a run produced at least one accepted query and 0 when it produced none, so the
 * mean over repetitions reads directly as the share of runs that generated anything.
 *
 * Every quality evaluator abstains on an empty run, which keeps their scores about quality but
 * would otherwise make a failed generation invisible. This evaluator owns that failure.
 */
export const generationSuccessEvaluator: KIQueryGenerationEvaluator = {
  name: 'generation_success',
  kind: 'CODE' as const,
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const queries = getQueriesFromOutput(output);
    const attempts = getQueryAttempts(output);

    if (queries.length > 0) {
      return {
        score: 1,
        explanation: `Generated ${queries.length} accepted queries`,
        metadata: { acceptedQueryCount: queries.length, attemptedQueryCount: attempts?.length },
      };
    }

    // Distinguish "never tried" from "tried and everything was rejected": the first points at the
    // agent giving up before calling add_queries, the second at validation rejecting every query.
    const attemptedNothing = !attempts || attempts.length === 0;

    return {
      score: 0,
      explanation: attemptedNothing
        ? 'No queries generated: add_queries produced no attempts'
        : `No queries accepted: all ${attempts.length} attempts were rejected`,
      metadata: {
        acceptedQueryCount: 0,
        attemptedQueryCount: attempts?.length,
        attemptedNothing,
      },
    };
  },
};
