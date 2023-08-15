/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { CSSProperties } from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { HostMetricsDocsLink } from '../../../../../components/lens';
import { Tile } from './tile';
import { HostCountProvider } from '../../hooks/use_host_count';
import { HostsTile } from './hosts_tile';
<<<<<<< HEAD
import {
  KPI_CHARTS,
  KPI_CHART_HEIGHT,
} from '../../../../../common/visualizations/lens/dashboards/host/kpi_grid_config';
=======
import { HostMetricsDocsLink } from '../metric_explanation/host_metrics_docs_link';
import { KPI_CHART_MIN_HEIGHT } from '../../constants';

const lensStyle: CSSProperties = {
  height: KPI_CHART_MIN_HEIGHT,
};

const KPI_CHARTS: Array<Omit<KPIChartProps, 'loading' | 'subtitle' | 'style'>> = [
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
    toolTip: TOOLTIP.normalizedLoad1m,
  },
  {
    type: 'memoryUsage',
    trendLine: true,
    backgroundColor: '#A987D1',
    title: i18n.translate('xpack.infra.hostsViewPage.metricTrend.memoryUsage.title', {
      defaultMessage: 'Memory Usage',
    }),
    toolTip: TOOLTIP.memoryUsage,
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
>>>>>>> whats-new

export const KPIGrid = () => {
  return (
    <HostCountProvider>
      <HostMetricsDocsLink type="metrics" />
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="row" gutterSize="s" data-test-subj="hostsViewKPIGrid">
        <EuiFlexItem>
<<<<<<< HEAD
          <HostsTile height={KPI_CHART_HEIGHT} />
        </EuiFlexItem>
        {KPI_CHARTS.map((chartProp, index) => (
          <EuiFlexItem key={index}>
            <Tile {...chartProp} height={KPI_CHART_HEIGHT} />
=======
          <HostsTile style={lensStyle} />
        </EuiFlexItem>
        {KPI_CHARTS.map(({ ...chartProp }) => (
          <EuiFlexItem key={chartProp.type}>
            <Tile {...chartProp} style={lensStyle} />
>>>>>>> whats-new
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </HostCountProvider>
  );
};
