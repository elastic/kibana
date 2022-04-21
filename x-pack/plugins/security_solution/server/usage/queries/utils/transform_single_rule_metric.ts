/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SingleEventMetric } from '../../detections/rules/types';
import type {
  CountCardinality,
  CountCardinalityWithCategories,
  SingleExecutionMetricAgg,
} from '../../types';
import { transformCategories } from './transform_categories';

export interface TransformSingleRuleMetricOptions {
  failed: CountCardinalityWithCategories;
  partialFailed: CountCardinalityWithCategories;
  succeeded: CountCardinality;
  singleMetric: SingleExecutionMetricAgg;
}

/**
 * Given a different count cardinalities this will return them broken down by various
 * metrics such as "failed", "partial failed", "succeeded, and will list a top 10 of each
 * of the error message types.
 * @param failed The failed counts and top 10 "messages"
 * @param partialFailed The partial failed counts and top 10 "messages"
 * @param succeeded The succeeded counts
 * @param singleMetric The max/min/avg metric
 * @returns The single metric from the aggregation broken down
 */
export const transformSingleRuleMetric = ({
  failed,
  partialFailed,
  succeeded,
  singleMetric,
}: TransformSingleRuleMetricOptions): SingleEventMetric => {
  return {
    failures: failed.cardinality.value ?? 0,
    top_failures: transformCategories(failed.categories),
    partial_failures: partialFailed.cardinality.value ?? 0,
    top_partial_failures: transformCategories(partialFailed.categories),
    succeeded: succeeded.cardinality.value ?? 0,
    index_duration: {
      max: singleMetric.maxTotalIndexDuration.value ?? 0.0,
      avg: singleMetric.avgTotalIndexDuration.value ?? 0.0,
      min: singleMetric.minTotalIndexDuration.value ?? 0.0,
    },
    search_duration: {
      max: singleMetric.maxTotalSearchDuration.value ?? 0.0,
      avg: singleMetric.avgTotalSearchDuration.value ?? 0.0,
      min: singleMetric.minTotalSearchDuration.value ?? 0.0,
    },
    gap_duration: {
      max: singleMetric.maxGapDuration.value ?? 0.0,
      avg: singleMetric.avgGapDuration.value ?? 0.0,
      min: singleMetric.minGapDuration.value ?? 0.0,
    },
    gap_count: singleMetric.gapCount.value ?? 0.0,
  };
};
