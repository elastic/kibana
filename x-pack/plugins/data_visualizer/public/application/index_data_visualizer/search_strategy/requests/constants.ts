/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export const SAMPLER_TOP_TERMS_THRESHOLD = 100000;
export const SAMPLER_TOP_TERMS_SHARD_SIZE = 5000;
export const AGGREGATABLE_EXISTS_REQUEST_BATCH_SIZE = 200;
export const FIELDS_REQUEST_BATCH_SIZE = 10;

export const MAX_CHART_COLUMNS = 20;

export const MAX_EXAMPLES_DEFAULT = 10;
export const MAX_PERCENT = 100;
export const PERCENTILE_SPACING = 5;

/**
 * Wraps the supplied aggregations in a sampler aggregation.
 * A supplied samplerShardSize (the shard_size parameter of the sampler aggregation)
 * of less than 1 indicates no sampling, and the aggs are returned as-is.
 */
export function buildRandomSamplerAggregation(
  aggs: any,
  probability: number,
  seed?: number
): Record<string, estypes.AggregationsAggregationContainer> {
  if (probability <= 0 || probability > 1) {
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
