/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AggregationSearchResponse } from '@elastic/elasticsearch';
import {
  METRIC_PROCESS_CPU_PERCENT,
  METRIC_SYSTEM_CPU_PERCENT
} from 'x-pack/plugins/apm/common/constants';
import { fetchMetrics } from '../metricsFetcher';
import { AggValue, MetricsRequestArgs, TimeSeriesBucket } from '../query_types';

interface Bucket extends TimeSeriesBucket {
  systemCPUAverage: AggValue;
  systemCPUMax: AggValue;
  processCPUAverage: AggValue;
  processCPUMax: AggValue;
}

interface Aggs {
  timeseriesData: {
    buckets: Bucket[];
  };
  systemCPUAverage: AggValue;
  systemCPUMax: AggValue;
  processCPUAverage: AggValue;
  processCPUMax: AggValue;
}

export type ESResponse = AggregationSearchResponse<void, Aggs>;

export async function fetch(args: MetricsRequestArgs) {
  return fetchMetrics<Aggs>({
    ...args,
    timeseriesBucketAggregations: {
      systemCPUAverage: { avg: { field: METRIC_SYSTEM_CPU_PERCENT } },
      systemCPUMax: { max: { field: METRIC_SYSTEM_CPU_PERCENT } },
      processCPUAverage: { avg: { field: METRIC_PROCESS_CPU_PERCENT } },
      processCPUMax: { max: { field: METRIC_PROCESS_CPU_PERCENT } }
    },
    totalAggregations: {
      systemCPUAverage: { avg: { field: METRIC_SYSTEM_CPU_PERCENT } },
      systemCPUMax: { max: { field: METRIC_SYSTEM_CPU_PERCENT } },
      processCPUAverage: { avg: { field: METRIC_PROCESS_CPU_PERCENT } },
      processCPUMax: { max: { field: METRIC_PROCESS_CPU_PERCENT } }
    }
  });
}
