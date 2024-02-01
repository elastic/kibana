/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';
import { isCounterTimeSeriesMetric, isGaugeTimeSeriesMetric } from '@kbn/ml-agg-utils';

/**
 * Partial list of supported ES aggs that are used by Index data visualizer/Field stats
 */
const SUPPORTED_AGGS = {
  COUNTER: new Set([
    'count',
    'histogram',
    'variable_width_histogram',
    'rate',
    'min',
    'max',
    'top_metrics',
    'range',
  ]),
  GAUGE: new Set([
    'count',
    'max',
    'top_metrics',
    'missing',
    'date_histogram',
    'sum',
    'rate',
    'boxplot',
    'value_count',
    'avg',
    'percentiles',
    'cardinality',
    'histogram',
    'variable_width_histogram',
    'frequent_item_sets',
    'min',
    'stats',
    'diversified_sampler',
    'percentile_ranks',
    'median_absolute_deviation',
    'multi_terms',
    'auto_date_histogram',
    'rare_terms',
    'range',
    'extended_stats',
    'date_range',
    'terms',
    'significant_terms',
  ]),
  AGGREGATABLE: new Set([
    'count',
    'avg',
    'cardinality',
    'histogram',
    'percentiles',
    'stats',
    'terms',
  ]),
  DEFAULT: new Set<string>(),
};

/**
 * Temporarily add list of supported ES aggs until the PR below is merged
 * https://github.com/elastic/elasticsearch/pull/93884
 */
export const getSupportedAggs = (field: DataViewField) => {
  if (isCounterTimeSeriesMetric(field)) return SUPPORTED_AGGS.COUNTER;
  if (isGaugeTimeSeriesMetric(field)) return SUPPORTED_AGGS.GAUGE;
  if (field.aggregatable) return SUPPORTED_AGGS.AGGREGATABLE;
  return SUPPORTED_AGGS.DEFAULT;
};

export const getESQLSupportedAggs = (
  field: { name: string; type: string },
  aggregatable = true
) => {
  if (aggregatable) return SUPPORTED_AGGS.AGGREGATABLE;
  return SUPPORTED_AGGS.DEFAULT;
};
