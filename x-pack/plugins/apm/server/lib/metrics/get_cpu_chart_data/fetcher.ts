/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AggregationSearchResponse } from 'elasticsearch';
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
    timeseriesAggregates: {
      systemCPUAverage: { avg: { field: 'system.cpu.total.norm.pct' } },
      systemCPUMax: { max: { field: 'system.cpu.total.norm.pct' } },
      processCPUAverage: {
        avg: { field: 'system.process.cpu.total.norm.pct' }
      },
      processCPUMax: { max: { field: 'system.process.cpu.total.norm.pct' } }
    },
    otherAggregates: {
      systemCPUAverage: { avg: { field: 'system.cpu.total.norm.pct' } },
      systemCPUMax: { max: { field: 'system.cpu.total.norm.pct' } },
      processCPUAverage: {
        avg: { field: 'system.process.cpu.total.norm.pct' }
      },
      processCPUMax: { max: { field: 'system.process.cpu.total.norm.pct' } }
    }
  });
}
