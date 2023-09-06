/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { hostLensFormulas } from '../../../../constants';
import { REFERENCE_LINE, XY_OVERRIDES } from '../../constants';
import type { XYConfig } from './types';

export const cpuUsage: XYConfig = {
  id: 'cpuUsage',
  title: i18n.translate('xpack.infra.assetDetails.metricsCharts.cpuUsage', {
    defaultMessage: 'CPU Usage',
  }),

  layers: [
    {
      data: [hostLensFormulas.cpuUsage],
      type: 'visualization',
    },
  ],
  dataViewOrigin: 'metrics',
  overrides: {
    axisLeft: XY_OVERRIDES.axisLeft,
  },
};

export const cpuUsageBreakdown: XYConfig = {
  id: 'cpuUsageBreakdown',
  title: i18n.translate('xpack.infra.assetDetails.metricsCharts.cpuUsage', {
    defaultMessage: 'CPU Usage',
  }),
  layers: [
    {
      data: [
        hostLensFormulas.cpuUsageIowait,
        hostLensFormulas.cpuUsageIrq,
        hostLensFormulas.cpuUsageNice,
        hostLensFormulas.cpuUsageSoftirq,
        hostLensFormulas.cpuUsageSteal,
        hostLensFormulas.cpuUsageUser,
        hostLensFormulas.cpuUsageSystem,
      ],
      options: {
        seriesType: 'area_percentage_stacked',
      },
      type: 'visualization',
    },
  ],
  overrides: {
    axisLeft: XY_OVERRIDES.axisLeft,
    settings: XY_OVERRIDES.settings,
  },
  dataViewOrigin: 'metrics',
};

export const normalizedLoad1m: XYConfig = {
  id: 'normalizedLoad1m',
  title: i18n.translate('xpack.infra.assetDetails.metricsCharts.normalizedLoad1m', {
    defaultMessage: 'Normalized Load',
  }),
  layers: [
    {
      data: [hostLensFormulas.normalizedLoad1m],
      type: 'visualization',
    },
    {
      data: [REFERENCE_LINE],
      type: 'referenceLines',
    },
  ],
  dataViewOrigin: 'metrics',
};

export const loadBreakdown: XYConfig = {
  id: 'loadBreakdown',
  title: i18n.translate('xpack.infra.assetDetails.metricsCharts.load', {
    defaultMessage: 'Load',
  }),
  layers: [
    {
      data: [hostLensFormulas.load1m, hostLensFormulas.load5m, hostLensFormulas.load15m],
      options: {
        seriesType: 'area',
      },
      type: 'visualization',
    },
  ],
  overrides: {
    settings: XY_OVERRIDES.settings,
  },
  dataViewOrigin: 'metrics',
};
