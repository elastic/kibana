/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../../../../helpers/setup_request';
import { fetch, HeapMemoryMetrics } from './fetcher';
import { ChartBase } from '../../../query_types';
import { transformDataToChart } from '../../../transform_metrics_chart';

// TODO: i18n for titles

const chartBase: ChartBase<HeapMemoryMetrics> = {
  title: 'Heap Memory',
  key: 'heap_memory_area_chart',
  type: 'area',
  yUnit: 'bytes',
  series: {
    heapMemoryMax: 'Max',
    heapMemoryCommitted: 'Committed'
  }
};

export async function getHeapMemoryChartData(
  setup: Setup,
  serviceName: string
) {
  const result = await fetch(setup, serviceName);
  return transformDataToChart<HeapMemoryMetrics>(result, chartBase);
}
