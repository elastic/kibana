/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationOptionsByType } from '@kbn/es-types';

import Boom from '@hapi/boom';
import { type MetricsAPIRequest } from '@kbn/metrics-data-access-plugin/common';
import { afterKeyObjectRT } from '../../../../common/http_api';
import { TIMESTAMP_FIELD } from '../../../../common/constants';
import { calculateDateHistogramOffset } from './calculate_date_histogram_offset';
import { createMetricsAggregations } from './create_metrics_aggregations';
import { calculateBucketSize } from './calculate_bucket_size';

const DEFAULT_LIMIT = 9;
const METRICSET_AGGS = {
  metricsets: {
    terms: {
      field: 'metricset.name',
    },
  },
};

type MetricsAggregation = ReturnType<typeof createMetricsAggregations>;
interface HistogramAggregation {
  histogram: {
    date_histogram: AggregationOptionsByType['date_histogram'];
    aggregations: MetricsAggregation;
  };
}

const createMetricHistogramAggs = (options: MetricsAPIRequest): HistogramAggregation => {
  const { intervalString } = calculateBucketSize(options.timerange);
  return {
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
  };
};

const getAfterKey = (options: MetricsAPIRequest) => {
  if (!options.afterKey) {
    return null;
  }
  if (afterKeyObjectRT.is(options.afterKey)) {
    return options.afterKey;
  } else {
    return { groupBy0: options.afterKey };
  }
};
export const createCompositeAggregations = (options: MetricsAPIRequest) => {
  if (!Array.isArray(options.groupBy) || !options.groupBy.length) {
    throw Boom.badRequest('groupBy must be informed.');
  }

  if (!options.includeTimeseries && !!options.metrics.find((p) => p.id === 'logRate')) {
    throw Boom.badRequest('logRate metric is not supported without time series');
  }

  const after = getAfterKey(options);

  return {
    groupings: {
      composite: {
        size: options.limit ?? DEFAULT_LIMIT,
        sources: options.groupBy.map((field, index) => ({
          [`groupBy${index}`]: { terms: { field } },
        })),
        ...(after ? { after } : {}),
      },
      aggs: {
        ...(options.includeTimeseries
          ? createMetricHistogramAggs(options)
          : createMetricsAggregations(options)),
        ...METRICSET_AGGS,
      },
    },
  };
};

export const createAggregations = (options: MetricsAPIRequest) => {
  return {
    ...createMetricHistogramAggs(options),
    ...METRICSET_AGGS,
  };
};
