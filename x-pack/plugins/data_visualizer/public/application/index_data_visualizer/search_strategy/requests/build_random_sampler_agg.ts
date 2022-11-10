/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  SamplingOption,
  RandomSamplingOption,
  NormalSamplingOption,
  NoSamplingOption,
} from '../../../../../common/types/field_stats';

export const EMBEDDABLE_SAMPLER_OPTION = {
  RANDOM: 'random_sampling',
  NORMAL: 'normal_sampling',
};
export type FieldStatsEmbeddableSamplerOption =
  typeof EMBEDDABLE_SAMPLER_OPTION[keyof typeof EMBEDDABLE_SAMPLER_OPTION];

export function isRandomSamplingOption(arg: SamplingOption): arg is RandomSamplingOption {
  return arg.mode === 'random_sampling';
}
export function isNormalSamplingOption(arg: SamplingOption): arg is NormalSamplingOption {
  return arg.mode === 'normal_sampling';
}
export function isNoSamplingOption(arg: SamplingOption): arg is NoSamplingOption {
  return arg.mode === 'no_sampling' || (arg.mode === 'random_sampling' && arg.probability === 1);
}

export function buildAggregationWithSamplingOption(
  aggs: any,
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

export function buildSamplerAggregation(
  aggs: any,
  shardSize: number
): Record<string, estypes.AggregationsAggregationContainer> {
  if (shardSize <= 0) {
    return aggs;
  }

  return {
    sample: {
      aggs,
      sampler: {
        shard_size: shardSize,
      },
    },
  };
}
