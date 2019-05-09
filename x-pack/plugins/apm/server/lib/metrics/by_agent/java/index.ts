/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getHeapMemoryChart } from './heap_memory';
import { Setup } from '../../../helpers/setup_request';
import { getNonHeapMemoryChart } from './non_heap_memory';
import { getThreadCountChart } from './thread_count';

export async function getJavaMetricsCharts(setup: Setup, serviceName: string) {
  const charts = await Promise.all([
    getHeapMemoryChart(setup, serviceName),
    getNonHeapMemoryChart(setup, serviceName),
    getThreadCountChart(setup, serviceName)
  ]);

  return { charts };
}
