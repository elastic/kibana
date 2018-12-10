/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Coordinate } from 'x-pack/plugins/apm/typings/timeseries';
import { AggValue } from '../query_types';
import { ESResponse } from './fetcher';

export interface CPUChartAPIResponse {
  series: {
    systemCPUAverage: Coordinate[];
    systemCPUMax: Coordinate[];
    processCPUAverage: Coordinate[];
    processCPUMax: Coordinate[];
  };
  // overall totals for the whole time range
  overallValues: {
    systemCPUAverage: AggValue['value'];
    systemCPUMax: AggValue['value'];
    processCPUAverage: AggValue['value'];
    processCPUMax: AggValue['value'];
  };
  totalHits: number;
}

export type MemoryMetricName =
  | 'systemCPUAverage'
  | 'systemCPUMax'
  | 'processCPUAverage'
  | 'processCPUMax';

const MEMORY_METRIC_NAMES: MemoryMetricName[] = [
  'systemCPUAverage',
  'systemCPUMax',
  'processCPUAverage',
  'processCPUMax'
];

export function transform(result: ESResponse): CPUChartAPIResponse {
  const { aggregations, hits } = result;
  const {
    timeseriesData,
    systemCPUAverage,
    systemCPUMax,
    processCPUAverage,
    processCPUMax
  } = aggregations;

  const series: CPUChartAPIResponse['series'] = {
    systemCPUAverage: [],
    systemCPUMax: [],
    processCPUAverage: [],
    processCPUMax: []
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
      systemCPUAverage: systemCPUAverage.value,
      systemCPUMax: systemCPUMax.value,
      processCPUAverage: processCPUAverage.value,
      processCPUMax: processCPUMax.value
    },
    totalHits: hits.total
  };
}
