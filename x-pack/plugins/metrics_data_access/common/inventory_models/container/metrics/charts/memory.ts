/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensConfigWithId } from '../../../types';
import {
  DEFAULT_XY_FITTING_FUNCTION,
  DEFAULT_XY_HIDDEN_AXIS_TITLE,
  DEFAULT_XY_HIDDEN_LEGEND,
  DEFAULT_XY_YBOUNDS,
  MEMORY_USAGE_LABEL,
} from '../../../shared/charts/constants';
import { formulas } from '../formulas';

const memoryUsageXY: LensConfigWithId = {
  id: 'memoryUsage',
  chartType: 'xy',
  title: MEMORY_USAGE_LABEL,
  layers: [
    {
      seriesType: 'line',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [formulas.memoryUsage],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_HIDDEN_LEGEND,
  ...DEFAULT_XY_YBOUNDS,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

const memoryUsageMetric: LensConfigWithId = {
  id: 'memoryUsage',
  chartType: 'metric',
  title: MEMORY_USAGE_LABEL,
  trendLine: true,
  ...formulas.memoryUsage,
};

export const memory = {
  xy: { memoryUsage: memoryUsageXY },
  metric: { memoryUsageMetric },
};
