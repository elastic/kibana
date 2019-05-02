/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ESFilter } from 'elasticsearch';
import {
  SERVICE_AGENT_NAME,
  PROCESSOR_EVENT,
  SERVICE_NAME
} from '../../../../../../common/elasticsearch_fieldnames';
import { PromiseReturnType } from '../../../../../../typings/common';
import { Setup } from '../../../../helpers/setup_request';
import { MetricsAggs, MetricsKeys, AggValue } from '../../../query_types';
import { getMetricsDateHistogramParams } from '../../../../helpers/metrics';

export interface NonHeapMemoryMetrics extends MetricsKeys {
  nonHeapMemoryMax: AggValue;
  nonHeapMemoryCommitted: AggValue;
}

export type HeapMemoryResponse = PromiseReturnType<typeof fetch>;
export async function fetch(setup: Setup, serviceName: string) {
  const { start, end, esFilterQuery, client, config } = setup;
  const filters: ESFilter[] = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [PROCESSOR_EVENT]: 'metric' } },
    { term: { [SERVICE_AGENT_NAME]: 'java' } },
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
          date_histogram: getMetricsDateHistogramParams(start, end),
          aggs: {
            nonHeapMemoryMax: { avg: { field: 'jvm.memory.non_heap.max' } },
            nonHeapMemoryCommitted: {
              avg: { field: 'jvm.memory.non_heap.committed' }
            }
          }
        },
        nonHeapMemoryMax: { avg: { field: 'jvm.memory.non_heap.max' } },
        nonHeapMemoryCommitted: {
          avg: { field: 'jvm.memory.non_heap.committed' }
        }
      }
    }
  };

  return client<void, MetricsAggs<NonHeapMemoryMetrics>>('search', params);
}
