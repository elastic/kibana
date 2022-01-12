/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup } from '../../../lib/helpers/setup_request';
import { getCPUChartData } from './shared/cpu';
import { getMemoryChartData } from './shared/memory';

export function getDefaultMetricsCharts({
  environment,
  kuery,
  serviceName,
  setup,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  setup: Setup;
  start: number;
  end: number;
}) {
  return Promise.all([
    getCPUChartData({ environment, kuery, setup, serviceName, start, end }),
    getMemoryChartData({ environment, kuery, setup, serviceName, start, end }),
  ]);
}
