/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cpuCharts } from './cpu_charts';
import { diskCharts } from './disk_charts';
import { memoryCharts } from './memory_charts';
import { networkCharts } from './network_charts';
import { logRateCharts } from './log_rate_charts';
import { charts as kubernetesNodeCharts } from '../../../kubernetes/node/metrics';

export const charts = {
  cpuCharts,
  diskCharts,
  memoryCharts,
  networkCharts,
  logRateCharts,
  kubernetesNodeCharts: kubernetesNodeCharts.nodeCharts,
} as const;

export type HostCharts = typeof charts;
