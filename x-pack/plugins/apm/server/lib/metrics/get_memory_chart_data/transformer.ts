/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Coordinate } from 'x-pack/plugins/apm/typings/timeseries';
import { ESResponse } from './fetcher';

export interface MemoryChartAPIResponse {
  series: {
    memoryUsedAvg: Coordinate[];
    memoryUsedMax: Coordinate[];
  };
  // overall totals for the whole time range
  overallValues: {
    memoryUsedAvg: number | null;
    memoryUsedMax: number | null;
  };
  totalHits: number;
}

export type MemoryMetricName = 'memoryUsedAvg' | 'memoryUsedMax';

const MEMORY_METRIC_NAMES: MemoryMetricName[] = [
  'memoryUsedAvg',
  'memoryUsedMax'
];

export function transform(result: ESResponse): MemoryChartAPIResponse {
  const { aggregations, hits } = result;
  const { timeseriesData, memoryUsedAvg, memoryUsedMax } = aggregations;

  const series: MemoryChartAPIResponse['series'] = {
    memoryUsedAvg: [],
    memoryUsedMax: []
  };

  // using forEach here to avoid looping over the entire dataset
  // multiple times or doing a complicated, memory-heavy map/reduce
  timeseriesData.buckets.forEach(({ key, ...bucket }) => {
    MEMORY_METRIC_NAMES.forEach(name => {
      series[name].push({ x: key, y: bucket[name].value });
    });
  });

  return {
    series,
    overallValues: {
      memoryUsedAvg: memoryUsedAvg.value,
      memoryUsedMax: memoryUsedMax.value
    },
    totalHits: hits.total
  };
}
