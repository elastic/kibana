/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AggregationSearchResponse } from 'elasticsearch';
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
    timeseriesAggregates: {
      // TODO: constants
      freeMemory: { avg: { field: 'system.memory.actual.free' } },
      totalMemory: { avg: { field: 'system.memory.total' } },
      processMemorySize: { avg: { field: 'system.process.memory.size' } },
      processMemoryRss: {
        avg: { field: 'system.process.memory.rss.bytes' }
      }
    },
    otherAggregates: {
      // TODO: constants
      freeMemory: { avg: { field: 'system.memory.actual.free' } },
      totalMemory: { avg: { field: 'system.memory.total' } },
      processMemorySize: { avg: { field: 'system.process.memory.size' } },
      processMemoryRss: { avg: { field: 'system.process.memory.rss.bytes' } }
    }
  });
}
