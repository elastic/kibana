/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cpuUsage } from './cpu_usage';
import { cpuUsageIowait } from './cpu_usage_iowait';
import { cpuUsageIrq } from './cpu_usage_irq';
import { cpuUsageNice } from './cpu_usage_nice';
import { cpuUsageSoftirq } from './cpu_usage_softirq';
import { cpuUsageSteal } from './cpu_usage_steal';
import { cpuUsageUser } from './cpu_usage_user';
import { cpuUsageSystem } from './cpu_usage_system';
import { diskIORead } from './disk_read_iops';
import { diskIOWrite } from './disk_write_iops';
import { diskReadThroughput } from './disk_read_throughput';
import { diskWriteThroughput } from './disk_write_throughput';
import { diskSpaceAvailability } from './disk_space_availability';
import { diskSpaceAvailable } from './disk_space_available';
import { diskUsage } from './disk_usage';
import { hostCount } from './host_count';
import { logRate } from './log_rate';
import { normalizedLoad1m } from './normalized_load_1m';
import { load1m } from './load_1m';
import { load5m } from './load_5m';
import { load15m } from './load_15m';
import { memoryUsage } from './memory_usage';
import { memoryFree } from './memory_free';
import { memoryUsed } from './memory_used';
import { memoryFreeExcludingCache } from './memory_free_excluding_cache';
import { memoryCache } from './memory_cache';
import { rx } from './rx';
import { tx } from './tx';

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
};

export type HostFormulas = typeof formulas;
export type HostFormulaNames = keyof HostFormulas;
