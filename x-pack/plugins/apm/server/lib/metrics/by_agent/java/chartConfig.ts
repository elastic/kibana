/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { JavaMetrics } from './fetcher';
import { ChartType, YUnit } from '../../../../../typings/common';

export type JavaMetricName = keyof JavaMetrics;

export interface Chart {
  title: string;
  key: string;
  type: ChartType;
  yUnit: YUnit;
  series: JavaMetricName[];
}

type SeriesMap = { [key in JavaMetricName]: string };

export const seriesTitleMap: SeriesMap = {
  heapMemoryMax: 'Max',
  heapMemoryCommitted: 'Committed',
  nonHeapMemoryMax: 'Max'
};

export const charts: Chart[] = [
  {
    title: 'Heap Memory',
    key: 'heap_memory_area_chart',
    type: 'area',
    yUnit: 'bytes',
    series: ['heapMemoryMax', 'heapMemoryCommitted']
  },
  {
    title: 'Non-Heap Memory',
    key: 'non_heap_memory_area_chart',
    type: 'area',
    yUnit: 'bytes',
    series: ['nonHeapMemoryMax']
  },
  {
    title: 'Thread Count',
    key: 'thread_count_chart',
    type: 'linemark',
    yUnit: 'number',
    series: ['threadCount']
  }
];
