/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { LensConfigWithId } from '../../../../types';
import { formulas } from '../formulas';
import {
  DEFAULT_XY_FITTING_FUNCTION,
  DEFAULT_XY_HIDDEN_AXIS_TITLE,
  DEFAULT_XY_LEGEND,
} from '../../../../shared/charts/constants';

const nodeCpuCapacity: LensConfigWithId = {
  id: 'nodeCpuCapacity',
  chartType: 'xy',
  title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.kubernetes.nodeCpuCapacity', {
    defaultMessage: 'Node CPU Capacity',
  }),
  layers: [
    {
      seriesType: 'area',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [formulas.nodeCpuCapacity, formulas.nodeCpuUsed],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_LEGEND,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

const nodeMemoryCapacity: LensConfigWithId = {
  id: 'nodeMemoryCapacity',
  chartType: 'xy',
  title: i18n.translate(
    'xpack.metricsData.assetDetails.metricsCharts.kubernetes.nodeMemoryCapacity',
    {
      defaultMessage: 'Node Memory Capacity',
    }
  ),
  layers: [
    {
      seriesType: 'area',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [formulas.nodeMemoryCapacity, formulas.nodeMemoryUsed],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_LEGEND,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

const nodeDiskCapacity: LensConfigWithId = {
  id: 'nodeDiskCapacity',
  chartType: 'xy',
  title: i18n.translate(
    'xpack.metricsData.assetDetails.metricsCharts.kubernetes.nodeDiskCapacity',
    {
      defaultMessage: 'Node Disk Capacity',
    }
  ),
  layers: [
    {
      seriesType: 'area',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [formulas.nodeDiskCapacity, formulas.nodeDiskUsed],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_LEGEND,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

const nodePodCapacity: LensConfigWithId = {
  id: 'nodePodCapacity',
  chartType: 'xy',
  title: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.kubernetes.nodePodCapacity', {
    defaultMessage: 'Node Pod Capacity',
  }),
  layers: [
    {
      seriesType: 'area',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [formulas.nodePodCapacity, formulas.nodePodUsed],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_LEGEND,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

export const node = {
  xy: {
    nodeCpuCapacity,
    nodeMemoryCapacity,
    nodeDiskCapacity,
    nodePodCapacity,
  },
} as const;
