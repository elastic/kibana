/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KPIChartProps, Tile } from './tile';
import { HostCountProvider } from '../../hooks/use_host_count';
import { HostsTile } from './hosts_tile';

const KPI_CHARTS: Array<Omit<KPIChartProps, 'loading' | 'subtitle'>> = [
  {
    type: 'cpuUsage',
    trendLine: true,
    backgroundColor: '#F1D86F',
    title: i18n.translate('xpack.infra.hostsViewPage.metricTrend.cpuUsage.title', {
      defaultMessage: 'CPU Usage',
    }),
    toolTip: i18n.translate('xpack.infra.hostsViewPage.metricTrend.cpuUsage.tooltip', {
      defaultMessage:
        'Percentage of CPU time spent in states other than Idle and IOWait, normalized by the number of CPU cores. This includes both time spent on user space and kernel space.',
    }),
  },
  {
    type: 'normalizedLoad1m',
    trendLine: true,
    backgroundColor: '#79AAD9',
    title: i18n.translate('xpack.infra.hostsViewPage.metricTrend.normalizedLoad1m.title', {
      defaultMessage: 'Normalized Load',
    }),
    toolTip: i18n.translate('xpack.infra.hostsViewPage.metricTrend.normalizedLoad1m.tooltip', {
      defaultMessage: '1 minute load average normalized by the number of CPU cores.',
    }),
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
    toolTip: i18n.translate('xpack.infra.hostsViewPage.metricTrend.diskSpaceUsage.tooltip', {
      defaultMessage: 'Percentage of disk space used.',
    }),
  },
];

export const KPIGrid = () => {
  return (
    <HostCountProvider>
      <EuiFlexGroup
        direction="row"
        gutterSize="s"
        style={{ flexGrow: 0 }}
        data-test-subj="hostsViewKPIGrid"
      >
        <EuiFlexItem>
          <HostsTile />
        </EuiFlexItem>
        {KPI_CHARTS.map(({ ...chartProp }) => (
          <EuiFlexItem key={chartProp.type}>
            <Tile {...chartProp} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </HostCountProvider>
  );
};
