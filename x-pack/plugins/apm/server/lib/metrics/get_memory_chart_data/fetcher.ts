/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AggregationSearchResponse } from 'elasticsearch';
import { SERVICE_NAME } from '../../../../common/constants';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { MetricsRequestArgs } from '../get_metrics_request_args';

export interface AggValue {
  value: number | null;
}

export interface ESBucket {
  key_as_string: string; // timestamp as string
  key: number; // timestamp as epoch milliseconds
  doc_count: number;
  totalMemory: AggValue;
  freeMemory: AggValue;
  processMemorySize: AggValue;
  processMemoryRss: AggValue;
}

export interface Aggs {
  timeseriesData: {
    buckets: ESBucket[];
  };
  totalMemory: AggValue;
  freeMemory: AggValue;
  processMemorySize: AggValue;
  processMemoryRss: AggValue;
}

export type ESResponse = AggregationSearchResponse<void, Aggs>;

export async function fetch({ serviceName, setup }: MetricsRequestArgs) {
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
                // TODO: use constants
                'processor.name': 'metric'
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
          aggs: {
            // TODO: constants
            freeMemory: { avg: { field: 'system.memory.actual.free' } },
            totalMemory: { avg: { field: 'system.memory.total' } },
            processMemorySize: { avg: { field: 'system.process.memory.size' } },
            processMemoryRss: {
              avg: { field: 'system.process.memory.rss.bytes' }
            }
          }
        },
        freeMemory: { avg: { field: 'system.memory.actual.free' } },
        totalMemory: { avg: { field: 'system.memory.total' } },
        processMemorySize: { avg: { field: 'system.process.memory.size' } },
        processMemoryRss: { avg: { field: 'system.process.memory.rss.bytes' } }
      }
    }
  }; // TODO: constants

  if (esFilterQuery) {
    params.body.query.bool.filter.push(esFilterQuery);
  }

  return client<void, Aggs>('search', params);
}
