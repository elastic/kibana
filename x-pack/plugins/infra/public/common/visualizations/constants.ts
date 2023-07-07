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
  diskSpaceAvailable,
  diskSpaceUsage,
  normalizedLoad1m,
  memoryUsage,
  memoryFree,
  rx,
  tx,
  hostCount,
} from './lens/formulas/host';
import { LineChart, MetricChart } from './lens/visualization_types';

export const hostLensFormulas = {
  cpuUsage,
  diskIORead,
  diskIOWrite,
  diskReadThroughput,
  diskWriteThroughput,
  diskSpaceAvailable,
  diskSpaceUsage,
  hostCount,
  normalizedLoad1m,
  memoryUsage,
  memoryFree,
  rx,
  tx,
};

export const visualizationTypes = {
  lineChart: LineChart,
  metricChart: MetricChart,
};

export const HOST_METRICS_DOC_HREF = 'https://ela.st/docs-infra-host-metrics';
