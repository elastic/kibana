/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricbeatMonitoredProduct, PackagesMonitoredProduct, QueryOptions } from '../types';

const MAX_BUCKET_SIZE = 50;

/**
 * Returns a nested aggregation of error messages per event.datasets.
 * Each module (beats, kibana...) can contain one or multiple metricsets with error messages
 */
interface ErrorsQueryOptions extends QueryOptions {
  products: MetricbeatMonitoredProduct[] | PackagesMonitoredProduct[];
  errorQueryType: 'metricbeatErrorsQuery' | 'packageErrorsQuery';
  errorQueryIsDataStream?: boolean;
}

export const errorsQuery = ({
  timeRange,
  timeout,
  products,
  errorQueryType,
  errorQueryIsDataStream,
}: ErrorsQueryOptions) => {
  if (!timeRange) throw new Error(`${errorQueryType}: missing timeRange parameter`);
  return {
    timeout: `${timeout}s`,
    query: {
      bool: {
        filter: {
          bool: {
            must: [
              {
                exists: {
                  field: 'error.message',
                },
              },
              {
                terms: {
                  [errorQueryIsDataStream ? 'service.type' : 'event.module']:
                    Object.values(products),
                },
              },
              {
                range: {
                  timestamp: {
                    gte: timeRange.min,
                    lte: timeRange.max,
                  },
                },
              },
            ],
          },
        },
      },
    },
    aggs: {
      errors_aggregation: errorsAggregation(errorQueryIsDataStream),
    },
  };
};

const errorsByMetricset = {
  terms: {
    field: 'metricset.name',
  },
  aggs: {
    latest_docs: {
      top_hits: {
        sort: [
          {
            '@timestamp': {
              order: 'desc',
            },
          },
        ],
        size: MAX_BUCKET_SIZE,
        _source: {
          includes: ['@timestamp', 'error', 'metricset'],
        },
      },
    },
  },
};

const errorsByDataStream = {
  terms: {
    field: 'data_stream.dataset',
  },
  aggs: {
    latest_docs: {
      top_hits: {
        sort: [
          {
            '@timestamp': {
              order: 'desc',
            },
          },
        ],
        size: MAX_BUCKET_SIZE,
        _source: {
          includes: ['@timestamp', 'error', 'data_stream'],
        },
      },
    },
  },
};

const errorsAggregation = (errorQueryIsDataStream?: boolean) => ({
  terms: {
    field: errorQueryIsDataStream ? 'service.type' : 'event.module',
  },
  aggs: {
    errors_by_dataset: errorQueryIsDataStream ? errorsByDataStream : errorsByMetricset,
  },
});
