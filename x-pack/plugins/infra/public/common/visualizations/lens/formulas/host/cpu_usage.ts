/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormulaValue, LayerValue } from '../../../types';

export const lineChartConfig: LineChartConfig = {
  extraVisualizationState: {
    yLeftExtent: {
      mode: 'custom',
      lowerBound: 0,
      upperBound: 1,
    },
  },
};

export const cpuUsage: LayerValue<FormulaValue> = {
  name: 'CPU Usage',
  data: {
    value:
      '(average(system.cpu.user.pct) + average(system.cpu.system.pct)) / max(system.cpu.cores)',
    format: {
      id: 'percent',
      params: {
        decimals: 0,
      },
    },
  },
};
