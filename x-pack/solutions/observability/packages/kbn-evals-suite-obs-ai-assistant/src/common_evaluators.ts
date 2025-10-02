/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEvaluators } from '@kbn/evals';

/**
 * Common criteria evaluator that can be used across all evaluation scenarios.
 * This provides a standardized evaluator with a consistent name "Criteria".
 * All evaluators simply extract criteria from expected.criteria.
 */
export function createCriteriaEvaluator({ evaluators }: { evaluators: DefaultEvaluators }) {
  return {
    name: 'Criteria',
    kind: 'LLM' as const,
    evaluate: async ({ input, output, expected, metadata }: any) => {
      const criteria = expected.criteria ?? [];
      const result = await evaluators
        .criteria(criteria)
        .evaluate({ input, expected, output, metadata });

      return result;
    },
  };
}
