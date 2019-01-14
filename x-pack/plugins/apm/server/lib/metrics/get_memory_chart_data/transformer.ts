/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Coordinate } from 'x-pack/plugins/apm/typings/timeseries';
import { ESResponse } from './fetcher';

export interface MemoryChartAPIResponse {
  series: {
    averagePercentMemoryUsed: Coordinate[];
    maximumPercentMemoryUsed: Coordinate[];
  };
  // overall totals for the whole time range
  overallValues: {
    averagePercentMemoryUsed: number | null;
    maximumPercentMemoryUsed: number | null;
  };
  totalHits: number;
}

export type MemoryMetricName =
  | 'averagePercentMemoryUsed'
  | 'maximumPercentMemoryUsed';

const MEMORY_METRIC_NAMES: MemoryMetricName[] = [
  'averagePercentMemoryUsed',
  'maximumPercentMemoryUsed'
];

export function transform(result: ESResponse): MemoryChartAPIResponse {
  const { aggregations, hits } = result;
  const {
    timeseriesData,
    averagePercentMemoryUsed,
    maximumPercentMemoryUsed
  } = aggregations;

  const series: MemoryChartAPIResponse['series'] = {
    averagePercentMemoryUsed: [],
    maximumPercentMemoryUsed: []
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
      averagePercentMemoryUsed: averagePercentMemoryUsed.value,
      maximumPercentMemoryUsed: maximumPercentMemoryUsed.value
    },
    totalHits: hits.total
  };
}
