/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  cpuUsage,
  diskIORead,
  diskIOWrite,
  diskReadThroughput,
  diskWriteThroughput,
  diskSpaceAvailability,
  diskSpaceAvailable,
  diskSpaceUsage,
  logRate,
  normalizedLoad1m,
  memoryUsage,
  memoryFree,
  rx,
  tx,
  hostCount,
} from './lens/formulas/host';

export const hostLensFormulas = {
  cpuUsage,
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
  memoryUsage,
  memoryFree,
  rx,
  tx,
};

export const HOST_METRICS_DOC_HREF = 'https://ela.st/docs-infra-host-metrics';
export const HOST_METRICS_DOTTED_LINES_DOC_HREF = 'https://ela.st/docs-infra-why-dotted';
