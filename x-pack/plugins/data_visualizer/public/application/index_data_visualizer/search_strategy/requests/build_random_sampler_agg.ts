/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

/**
 * Wraps the supplied aggregations in a random sampler aggregation.
 */
export function buildRandomSamplerAggregation(
  aggs: any,
  probability: number | null,
  seed: number
): Record<string, estypes.AggregationsAggregationContainer> {
  if (probability === null || probability <= 0 || probability > 1) {
    return aggs;
  }

  return {
    sample: {
      aggs,
      // @ts-expect-error AggregationsAggregationContainer needs to be updated with random_sampler
      random_sampler: {
        probability,
        ...(seed ? { seed } : {}),
      },
    },
  };
}
