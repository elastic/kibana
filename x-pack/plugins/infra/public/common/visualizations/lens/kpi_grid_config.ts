/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { HostsLensMetricChartFormulas } from '../types';
import { TOOLTIP } from './translations';

export interface KPIChartProps {
  title: string;
  subtitle?: string;
  trendLine?: boolean;
  backgroundColor: string;
  type: HostsLensMetricChartFormulas;
  decimals?: number;
  toolTip: string;
}

export const KPI_CHARTS: Array<Omit<KPIChartProps, 'loading' | 'subtitle' | 'style'>> = [
  {
    type: 'cpuUsage',
    trendLine: true,
    backgroundColor: '#F1D86F',
    title: i18n.translate('xpack.infra.hostsViewPage.metricTrend.cpuUsage.title', {
      defaultMessage: 'CPU Usage',
    }),
    toolTip: TOOLTIP.cpuUsage,
  },
  {
    type: 'normalizedLoad1m',
    trendLine: true,
    backgroundColor: '#79AAD9',
    title: i18n.translate('xpack.infra.hostsViewPage.metricTrend.normalizedLoad1m.title', {
      defaultMessage: 'Normalized Load',
    }),
    toolTip: TOOLTIP.rx,
  },
  {
    type: 'memoryUsage',
    trendLine: true,
    backgroundColor: '#A987D1',
    title: i18n.translate('xpack.infra.hostsViewPage.metricTrend.memoryUsage.title', {
      defaultMessage: 'Memory Usage',
    }),
    toolTip: i18n.translate('xpack.infra.hostsViewPage.metricTrend.memoryUsage.tooltip', {
      defaultMessage: 'Main memory usage excluding page cache.',
    }),
  },
  {
    type: 'diskSpaceUsage',
    trendLine: true,
    backgroundColor: '#F5A35C',
    title: i18n.translate('xpack.infra.hostsViewPage.metricTrend.diskSpaceUsage.title', {
      defaultMessage: 'Disk Space Usage',
    }),
    toolTip: TOOLTIP.tx,
  },
];
