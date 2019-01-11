/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Coordinate } from 'x-pack/plugins/apm/typings/timeseries';
import { ESResponse } from './fetcher';

export interface MemoryChartAPIResponse {
  series: {
    totalMemory: Coordinate[];
    freeMemory: Coordinate[];
    processMemorySize: Coordinate[];
    processMemoryRss: Coordinate[];
    averagePercentMemoryAvailable: Coordinate[];
    minimumPercentMemoryAvailable: Coordinate[];
  };
  // overall totals for the whole time range
  overallValues: {
    totalMemory: number | null;
    freeMemory: number | null;
    processMemorySize: number | null;
    processMemoryRss: number | null;
    averagePercentMemoryAvailable: number | null;
    minimumPercentMemoryAvailable: number | null;
  };
  totalHits: number;
}

export type MemoryMetricName =
  | 'totalMemory'
  | 'freeMemory'
  | 'processMemorySize'
  | 'processMemoryRss'
  | 'averagePercentMemoryAvailable'
  | 'minimumPercentMemoryAvailable';

const MEMORY_METRIC_NAMES: MemoryMetricName[] = [
  'totalMemory',
  'freeMemory',
  'processMemorySize',
  'processMemoryRss',
  'averagePercentMemoryAvailable',
  'minimumPercentMemoryAvailable'
];

export function transform(result: ESResponse): MemoryChartAPIResponse {
  const { aggregations, hits } = result;
  const {
    timeseriesData,
    totalMemory,
    freeMemory,
    processMemorySize,
    processMemoryRss,
    averagePercentMemoryAvailable,
    minimumPercentMemoryAvailable
  } = aggregations;

  const series: MemoryChartAPIResponse['series'] = {
    totalMemory: [],
    freeMemory: [],
    processMemorySize: [],
    processMemoryRss: [],
    averagePercentMemoryAvailable: [],
    minimumPercentMemoryAvailable: []
  };

  // using forEach here to avoid looping over the entire dataset
  // 4 times or doing a complicated, memory-heavy map/reduce
  timeseriesData.buckets.forEach(({ key, ...bucket }) => {
    MEMORY_METRIC_NAMES.forEach(name => {
      series[name].push({ x: key, y: bucket[name].value });
    });
  });

  return {
    series,
    overallValues: {
      totalMemory: totalMemory.value,
      freeMemory: freeMemory.value,
      processMemorySize: processMemorySize.value,
      processMemoryRss: processMemoryRss.value,
      averagePercentMemoryAvailable: averagePercentMemoryAvailable.value,
      minimumPercentMemoryAvailable: minimumPercentMemoryAvailable.value
    },
    totalHits: hits.total
  };
}
