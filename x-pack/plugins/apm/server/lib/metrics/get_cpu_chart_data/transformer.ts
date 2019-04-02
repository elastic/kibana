/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Coordinate } from '../../../../typings/timeseries';
import { ESResponse } from './fetcher';

type CPUMetricName =
  | 'systemCPUAverage'
  | 'systemCPUMax'
  | 'processCPUAverage'
  | 'processCPUMax';

const CPU_METRIC_NAMES: CPUMetricName[] = [
  'systemCPUAverage',
  'systemCPUMax',
  'processCPUAverage',
  'processCPUMax'
];

export type CPUChartAPIResponse = ReturnType<typeof transform>;

export function transform(result: ESResponse) {
  const { aggregations, hits } = result;
  const {
    timeseriesData,
    systemCPUAverage,
    systemCPUMax,
    processCPUAverage,
    processCPUMax
  } = aggregations;

  const series = {
    systemCPUAverage: [] as Coordinate[],
    systemCPUMax: [] as Coordinate[],
    processCPUAverage: [] as Coordinate[],
    processCPUMax: [] as Coordinate[]
  };

  // using forEach here to avoid looping over the entire dataset
  // 4 times or doing a complicated, memory-heavy map/reduce
  timeseriesData.buckets.forEach(({ key, ...bucket }) => {
    CPU_METRIC_NAMES.forEach(name => {
      series[name].push({ x: key, y: bucket[name].value });
    });
  });

  return {
    series,
    overallValues: {
      systemCPUAverage: systemCPUAverage.value,
      systemCPUMax: systemCPUMax.value,
      processCPUAverage: processCPUAverage.value,
      processCPUMax: processCPUMax.value
    },
    totalHits: hits.total
  };
}
