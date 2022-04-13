/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMESTAMP_FIELD } from '../../../../common/constants';
import { MetricsAPIRequest } from '../../../../common/http_api/metrics_api';
import { calculateDateHistogramOffset } from './calculate_date_histogram_offset';
import { createMetricsAggregations } from './create_metrics_aggregations';
import { calculateBucketSize } from './calculate_bucket_size';

export const createAggregations = (options: MetricsAPIRequest) => {
  const { intervalString } = calculateBucketSize(options.timerange);
  const histogramAggregation = {
    histogram: {
      date_histogram: {
        field: TIMESTAMP_FIELD,
        fixed_interval: intervalString,
        offset: options.alignDataToEnd ? calculateDateHistogramOffset(options.timerange) : '0s',
        extended_bounds: {
          min: options.timerange.from,
          max: options.timerange.to,
        },
      },
      aggregations: createMetricsAggregations(options),
    },
    metricsets: {
      terms: {
        field: 'metricset.name',
      },
    },
  };

  if (Array.isArray(options.groupBy) && options.groupBy.length) {
    const limit = options.limit || 9;
    return {
      groupings: {
        composite: {
          size: limit,
          sources: options.groupBy.map((field, index) => ({
            [`groupBy${index}`]: { terms: { field } },
          })),
        },
        aggs: histogramAggregation,
      },
    };
  }

  return histogramAggregation;
};
