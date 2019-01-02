/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AggregationSearchResponse } from 'elasticsearch';
import {
  METRIC_PROCESS_MEMORY_RSS,
  METRIC_PROCESS_MEMORY_SIZE,
  METRIC_SYSTEM_FREE_MEMORY,
  METRIC_SYSTEM_TOTAL_MEMORY
} from 'x-pack/plugins/apm/common/constants';
import { fetchMetrics } from '../metricsFetcher';
import { AggValue, MetricsRequestArgs, TimeSeriesBucket } from '../query_types';

interface Bucket extends TimeSeriesBucket {
  totalMemory: AggValue;
  freeMemory: AggValue;
  processMemorySize: AggValue;
  processMemoryRss: AggValue;
}

interface Aggs {
  timeseriesData: {
    buckets: Bucket[];
  };
  totalMemory: AggValue;
  freeMemory: AggValue;
  processMemorySize: AggValue;
  processMemoryRss: AggValue;
}

export type ESResponse = AggregationSearchResponse<void, Aggs>;

export async function fetch(args: MetricsRequestArgs) {
  return fetchMetrics<Aggs>({
    ...args,
    timeseriesBucketAggregations: {
      freeMemory: { avg: { field: METRIC_SYSTEM_FREE_MEMORY } },
      totalMemory: { avg: { field: METRIC_SYSTEM_TOTAL_MEMORY } },
      processMemorySize: { avg: { field: METRIC_PROCESS_MEMORY_SIZE } },
      processMemoryRss: { avg: { field: METRIC_PROCESS_MEMORY_RSS } }
    },
    totalAggregations: {
      freeMemory: { avg: { field: METRIC_SYSTEM_FREE_MEMORY } },
      totalMemory: { avg: { field: METRIC_SYSTEM_TOTAL_MEMORY } },
      processMemorySize: { avg: { field: METRIC_PROCESS_MEMORY_SIZE } },
      processMemoryRss: { avg: { field: METRIC_PROCESS_MEMORY_RSS } }
    }
  });
}
