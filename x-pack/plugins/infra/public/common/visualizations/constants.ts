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
  cpuUsageUser,
  cpuUsageSystem,
  diskIORead,
  diskIOWrite,
  diskReadThroughput,
  diskWriteThroughput,
  diskSpaceAvailability,
  diskSpaceAvailable,
  diskSpaceUsage,
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
  nginxActiveConnections,
  nginxRequestRate,
  rx,
  tx,
  hostCount,
} from './lens/formulas/host';

export const hostLensFormulas = {
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
  diskSpaceUsage,
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
  nginxActiveConnections,
  nginxRequestRate,
  rx,
  tx,
};

export const HOST_METRICS_DOC_HREF = 'https://ela.st/docs-infra-host-metrics';
export const HOST_METRICS_DOTTED_LINES_DOC_HREF = 'https://ela.st/docs-infra-why-dotted';
