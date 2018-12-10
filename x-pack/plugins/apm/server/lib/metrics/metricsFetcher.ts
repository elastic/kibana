/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PROCESSOR_NAME, SERVICE_NAME } from '../../../common/constants';
import { getBucketSize } from '../helpers/get_bucket_size';
import { MetricsRequestArgs } from './query_types';

export async function fetchMetrics<T = void>({
  serviceName,
  setup,
  timeseriesAggregates,
  otherAggregates = {}
}: MetricsRequestArgs) {
  const { start, end, esFilterQuery, client } = setup;
  const { intervalString } = getBucketSize(start, end, 'auto');

  const params = {
    // TODO: make this configurable (and set back to "apm-*-metrics-*")
    index: 'apm*',
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            {
              term: {
                [PROCESSOR_NAME]: 'metric'
              }
            },
            {
              range: {
                '@timestamp': { gte: start, lte: end, format: 'epoch_millis' }
              }
            }
          ]
        }
      },
      aggs: {
        timeseriesData: {
          date_histogram: {
            field: '@timestamp',
            interval: intervalString,
            min_doc_count: 0,
            extended_bounds: { min: start, max: end }
          },
          aggs: timeseriesAggregates
        },
        ...otherAggregates
      }
    }
  };

  if (esFilterQuery) {
    params.body.query.bool.filter.push(esFilterQuery);
  }

  return client<void, T>('search', params);
}
