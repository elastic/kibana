/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Aggs, SamplingOption } from '../../../../../common/types/field_stats';
import {
  isNormalSamplingOption,
  isRandomSamplingOption,
} from '../../../../../common/types/field_stats';

export function buildAggregationWithSamplingOption(
  aggs: Aggs,
  samplingOption: SamplingOption
): Record<string, estypes.AggregationsAggregationContainer> {
  if (!samplingOption) {
    return aggs;
  }
  const { seed } = samplingOption;

  if (isNormalSamplingOption(samplingOption)) {
    return {
      sample: {
        sampler: {
          shard_size: samplingOption.shardSize,
        },
        aggs,
      },
    };
  }

  if (isRandomSamplingOption(samplingOption)) {
    return {
      sample: {
        // @ts-expect-error AggregationsAggregationContainer needs to be updated with random_sampler
        random_sampler: {
          probability: samplingOption.probability,
          ...(seed ? { seed } : {}),
        },
        aggs,
      },
    };
  }

  // Else, if no sampling, use random sampler with probability set to 1
  // this is so that all results are returned under 'sample' path
  return {
    sample: {
      aggs,
      // @ts-expect-error AggregationsAggregationContainer needs to be updated with random_sampler
      random_sampler: {
        probability: 1,
        ...(seed ? { seed } : {}),
      },
    },
  };
}
