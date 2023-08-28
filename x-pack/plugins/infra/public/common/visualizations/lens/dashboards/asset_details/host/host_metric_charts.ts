/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { cpuUsage, normalizedLoad1m, cpuUsageBreakdown, loadBreakdown } from '../metric_charts/cpu';
import {
  diskSpaceUsageAvailable,
  diskThroughputReadWrite,
  diskIOReadWrite,
  diskSpaceUsageByMountPoint,
} from '../metric_charts/disk';
import { logRate } from '../metric_charts/log';
import { memoryUsage, memoryUsageBreakdown } from '../metric_charts/memory';
import { rxTx } from '../metric_charts/network';
import type { XYConfig } from '../metric_charts/types';

export const hostMetricCharts: XYConfig[] = [
  cpuUsage,
  memoryUsage,
  normalizedLoad1m,
  logRate,
  diskSpaceUsageAvailable,
  diskThroughputReadWrite,
  diskIOReadWrite,
  rxTx,
];

export const hostMetricChartsFullPage: XYConfig[] = [
  cpuUsage,
  cpuUsageBreakdown,
  memoryUsage,
  memoryUsageBreakdown,
  normalizedLoad1m,
  loadBreakdown,
  logRate,
  diskSpaceUsageAvailable,
  diskSpaceUsageByMountPoint,
  diskThroughputReadWrite,
  diskIOReadWrite,
  rxTx,
];
