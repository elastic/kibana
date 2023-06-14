/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensChartConfig, LensLineChartConfig } from '../../../types';
import { getFilters } from './utils';

export const cpuLineChart: LensLineChartConfig = {
  extraVisualizationState: {
    yLeftExtent: {
      mode: 'custom',
      lowerBound: 0,
      upperBound: 1,
    },
  },
};

export const cpu: LensChartConfig = {
  title: 'CPU Usage',
  formula: {
    formula:
      '(average(system.cpu.user.pct) + average(system.cpu.system.pct)) / max(system.cpu.cores)',
    format: {
      id: 'percent',
      params: {
        decimals: 0,
      },
    },
  },
  getFilters,

  lineChartConfig: cpuLineChart,
};
