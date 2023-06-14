/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  cpu,
  diskIORead,
  diskIOWrite,
  load,
  memory,
  memoryAvailable,
  rx,
  tx,
  hostCount,
} from './lens/formulas/host';
import { LineChart, MetricChart } from './lens/visualization_types';

export const hostLensFormulas = {
  cpu,
  diskIORead,
  diskIOWrite,
  hostCount,
  load,
  memory,
  memoryAvailable,
  rx,
  tx,
};

export const visualizationTypes = {
  lineChart: LineChart,
  metricChart: MetricChart,
};
