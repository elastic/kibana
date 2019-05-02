/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getHeapMemoryChartData } from './heap_memory';
import { Setup } from '../../../helpers/setup_request';
import { getNonHeapMemoryChartData } from './non_heap_memory';
import { PromiseReturnType } from '../../../../../typings/common';

export type JavaMetricsChartsResponse = PromiseReturnType<
  typeof getJavaMetricsCharts
>;

export async function getJavaMetricsCharts(setup: Setup, serviceName: string) {
  const charts = await Promise.all([
    getHeapMemoryChartData(setup, serviceName),
    getNonHeapMemoryChartData(setup, serviceName)
  ]);

  return { charts };
}
