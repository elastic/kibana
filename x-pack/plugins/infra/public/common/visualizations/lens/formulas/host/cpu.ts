/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensChartConfig, LensLineChartConfig } from '../../../types';

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
    formula: 'average(system.cpu.total.norm.pct)',
    format: {
      id: 'percent',
      params: {
        decimals: 0,
      },
    },
  },
  lineChartConfig: cpuLineChart,
};
