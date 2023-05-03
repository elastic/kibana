/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensChartConfig, LensLineChartConfig } from '../../../types';
import { getFilters } from './utils';

const memoryLineChart: LensLineChartConfig = {
  extraVisualizationState: {
    yLeftExtent: {
      mode: 'custom',
      lowerBound: 0,
      upperBound: 1,
    },
  },
};

export const memory: LensChartConfig = {
  title: 'Memory',
  formula: {
    formula: 'average(system.memory.actual.used.pct)',
    format: {
      id: 'percent',
      params: {
        decimals: 0,
      },
    },
  },
  lineChartConfig: memoryLineChart,
  getFilters,
};
