/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { hostLensFormulas } from '../../../constants';
import { TOOLTIP } from './translations';
import type { LensMetricChartProps } from '../../../../../components/lens';

export type KPIChartProps = Pick<
  LensMetricChartProps,
  'id' | 'title' | 'layers' | 'toolTip' | 'height'
>;

export const KPI_CHARTS: KPIChartProps[] = [
  {
    id: 'cpuUsage',
    title: i18n.translate('xpack.infra.hostsViewPage.metricTrend.cpuUsage.title', {
      defaultMessage: 'CPU Usage',
    }),
    layers: {
      data: {
        ...hostLensFormulas.cpuUsage,
        format: {
          ...hostLensFormulas.cpuUsage.format,
          params: {
            decimals: 1,
          },
        },
      },
      layerType: 'data',
      options: {
        backgroundColor: '#F1D86F',
        showTrendLine: true,
      },
    },
    toolTip: TOOLTIP.cpuUsage,
  },
  {
    id: 'normalizedLoad1m',
    title: i18n.translate('xpack.infra.hostsViewPage.metricTrend.normalizedLoad1m.title', {
      defaultMessage: 'CPU Usage',
    }),
    layers: {
      data: {
        ...hostLensFormulas.normalizedLoad1m,
        format: {
          ...hostLensFormulas.normalizedLoad1m.format,
          params: {
            decimals: 1,
          },
        },
      },
      layerType: 'data',
      options: {
        backgroundColor: '#79AAD9',
        showTrendLine: true,
      },
    },
    toolTip: TOOLTIP.normalizedLoad1m,
  },
  {
    id: 'memoryUsage',
    title: i18n.translate('xpack.infra.hostsViewPage.metricTrend.memoryUsage.title', {
      defaultMessage: 'CPU Usage',
    }),
    layers: {
      data: {
        ...hostLensFormulas.memoryUsage,
        format: {
          ...hostLensFormulas.memoryUsage.format,
          params: {
            decimals: 1,
          },
        },
      },
      layerType: 'data',
      options: {
        backgroundColor: '#A987D1',
        showTrendLine: true,
      },
    },
    toolTip: TOOLTIP.memoryUsage,
  },
  {
    id: 'diskSpaceUsage',
    title: i18n.translate('xpack.infra.hostsViewPage.metricTrend.diskSpaceUsage.title', {
      defaultMessage: 'CPU Usage',
    }),
    layers: {
      data: {
        ...hostLensFormulas.diskSpaceUsage,
        format: {
          ...hostLensFormulas.diskSpaceUsage.format,
          params: {
            decimals: 1,
          },
        },
      },
      layerType: 'data',
      options: {
        backgroundColor: '#F5A35C',
        showTrendLine: true,
      },
    },
    toolTip: TOOLTIP.diskSpaceUsage,
  },
];
