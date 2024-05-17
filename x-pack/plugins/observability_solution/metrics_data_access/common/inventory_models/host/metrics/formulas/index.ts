/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  cpuUsage,
  cpuUsageIowait,
  cpuUsageIrq,
  cpuUsageNice,
  cpuUsageSoftirq,
  cpuUsageSteal,
  cpuUsageSystem,
  cpuUsageUser,
  load1m,
  load5m,
  load15m,
  normalizedLoad1m,
} from './cpu';

import {
  diskIORead,
  diskIOWrite,
  diskReadThroughput,
  diskSpaceAvailability,
  diskSpaceAvailable,
  diskUsage,
  diskUsageAverage,
  diskWriteThroughput,
} from './disk';

import { hostCount } from './host_count';
import { logRate } from './log_rate';
import {
  memoryCache,
  memoryFree,
  memoryFreeExcludingCache,
  memoryUsage,
  memoryUsed,
} from './memory';
import { rx, tx } from './network';

export const formulas = {
  cpuUsage,
  cpuUsageIowait,
  cpuUsageIrq,
  cpuUsageNice,
  cpuUsageSoftirq,
  cpuUsageSteal,
  cpuUsageUser,
  cpuUsageSystem,
  diskIORead,
  diskIOWrite,
  diskReadThroughput,
  diskWriteThroughput,
  diskSpaceAvailability,
  diskSpaceAvailable,
  diskUsage,
  diskUsageAverage,
  hostCount,
  logRate,
  normalizedLoad1m,
  load1m,
  load5m,
  load15m,
  memoryUsage,
  memoryFree,
  memoryUsed,
  memoryFreeExcludingCache,
  memoryCache,
  rx,
  tx,
} as const;

export type HostFormulas = typeof formulas;
