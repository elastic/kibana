/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CPU_USAGE_LABEL,
  DEFAULT_XY_FITTING_FUNCTION,
  DEFAULT_XY_HIDDEN_AXIS_TITLE,
  DEFAULT_XY_HIDDEN_LEGEND,
  DEFAULT_XY_YBOUNDS,
} from '../../../shared/charts/constants';
import { LensConfigWithId } from '../../../types';
import { formulas } from '../formulas';

const cpuUsageXY: LensConfigWithId = {
  id: 'cpuUsage',
  chartType: 'xy',
  title: CPU_USAGE_LABEL,
  layers: [
    {
      seriesType: 'line',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [formulas.cpuUsage],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_HIDDEN_LEGEND,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
  ...DEFAULT_XY_YBOUNDS,
};

const cpuUsageMetric: LensConfigWithId = {
  id: 'cpuUsage',
  chartType: 'metric',
  title: CPU_USAGE_LABEL,
  trendLine: true,
  ...formulas.cpuUsage,
};

export const cpu = {
  xy: { cpuUsage: cpuUsageXY },
  metric: { cpuUsage: cpuUsageMetric },
} as const;
