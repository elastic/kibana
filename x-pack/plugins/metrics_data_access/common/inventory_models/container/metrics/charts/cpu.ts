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

const containerCpuUsageXY: LensConfigWithId = {
  id: 'cpuUsage',
  chartType: 'xy',
  title: CPU_USAGE_LABEL,
  layers: [
    {
      seriesType: 'line',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [formulas.containerCpuUsage],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_HIDDEN_LEGEND,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
  ...DEFAULT_XY_YBOUNDS,
};

const containerK8sCpuUsageXY: LensConfigWithId = {
  id: 'k8sCpuUsage',
  chartType: 'xy',
  title: CPU_USAGE_LABEL,
  layers: [
    {
      seriesType: 'line',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [formulas.containerK8sCpuUsage],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_HIDDEN_LEGEND,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
  ...DEFAULT_XY_YBOUNDS,
};

const containerCpuUsageMetric: LensConfigWithId = {
  id: 'cpuUsage',
  chartType: 'metric',
  title: CPU_USAGE_LABEL,
  trendLine: true,
  ...formulas.containerCpuUsage,
};

const containerK8sCpuUsageMetric: LensConfigWithId = {
  id: 'k8sCpuUsage',
  chartType: 'metric',
  title: CPU_USAGE_LABEL,
  trendLine: true,
  ...formulas.containerK8sCpuUsage,
};

export const cpu = {
  xy: { containerCpuUsage: containerCpuUsageXY, containerK8sCpuUsage: containerK8sCpuUsageXY },
  metric: {
    containerCpuUsage: containerCpuUsageMetric,
    containerK8sCpuUsage: containerK8sCpuUsageMetric,
  },
} as const;
