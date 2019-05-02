/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../../../../helpers/setup_request';
import { fetch, NonHeapMemoryMetrics } from './fetcher';
import { ChartBase } from '../../../query_types';
import { transformDataToChart } from '../../../transform_metrics_chart';

const chartBase: ChartBase<NonHeapMemoryMetrics> = {
  title: 'Non-Heap Memory',
  key: 'non_heap_memory_area_chart',
  type: 'area',
  yUnit: 'bytes',
  series: {
    nonHeapMemoryMax: 'Max',
    nonHeapMemoryCommitted: 'Committed'
  }
};

export async function getNonHeapMemoryChartData(
  setup: Setup,
  serviceName: string
) {
  const result = await fetch(setup, serviceName);
  return transformDataToChart<NonHeapMemoryMetrics>(result, chartBase);
}
