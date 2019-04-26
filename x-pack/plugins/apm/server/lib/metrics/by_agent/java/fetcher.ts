/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ESFilter } from 'elasticsearch';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME
} from '../../../../../common/elasticsearch_fieldnames';
import { PromiseReturnType } from '../../../../../typings/common';
import { getBucketSize } from '../../../helpers/get_bucket_size';
import { Setup } from '../../../helpers/setup_request';
import { AggValue, TimeSeriesBucket } from '../../query_types';

export interface JavaMetrics {
  heapMemoryMax: AggValue;
  heapMemoryCommitted: AggValue;
  nonHeapMemoryMax: AggValue;
}

type Bucket = TimeSeriesBucket & JavaMetrics;

interface Aggs extends JavaMetrics {
  timeseriesData: {
    buckets: Bucket[];
  };
}

export type ESResponse = PromiseReturnType<typeof fetch>;
export async function fetch(setup: Setup, serviceName: string) {
  const { start, end, esFilterQuery, client, config } = setup;
  const { bucketSize } = getBucketSize(start, end, 'auto');
  const filters: ESFilter[] = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [PROCESSOR_EVENT]: 'metric' } },
    { term: { 'agent.name': 'java' } },
    {
      range: { '@timestamp': { gte: start, lte: end, format: 'epoch_millis' } }
    }
  ];

  if (esFilterQuery) {
    filters.push(esFilterQuery);
  }

  const params = {
    index: config.get<string>('apm_oss.metricsIndices'),
    body: {
      size: 0,
      query: { bool: { filter: filters } },
      aggs: {
        timeseriesData: {
          date_histogram: {
            field: '@timestamp',

            // ensure minimum bucket size of 30s since this is the default resolution for metric data
            interval: `${Math.max(bucketSize, 30)}s`,
            min_doc_count: 0,
            extended_bounds: { min: start, max: end }
          },
          aggs: {
            heapMemoryMax: { avg: { field: 'jvm.memory.heap.max' } },
            heapMemoryCommitted: {
              avg: { field: 'jvm.memory.heap.committed' }
            },
            nonHeapMemoryMax: { avg: { field: 'jvm.memory.non_heap.max' } }
          }
        },
        heapMemoryMax: { avg: { field: 'jvm.memory.heap.max' } },
        heapMemoryCommitted: { avg: { field: 'jvm.memory.heap.committed' } },
        nonHeapMemoryMax: { avg: { field: 'jvm.memory.non_heap.max' } }
      }
    }
  };

  return client<void, Aggs>('search', params);
}
