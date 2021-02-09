/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getCPUChartData } from './shared/cpu';
import { getMemoryChartData } from './shared/memory';

export async function getDefaultMetricsCharts(
  setup: Setup & SetupTimeRange,
  serviceName: string
) {
  const charts = await Promise.all([
    getCPUChartData({ setup, serviceName }),
    getMemoryChartData({ setup, serviceName }),
  ]);

  return { charts };
}
