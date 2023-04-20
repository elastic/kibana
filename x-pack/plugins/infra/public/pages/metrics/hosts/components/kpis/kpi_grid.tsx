/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { KPIChartProps, Tile } from './tile';
import { HostsTile } from './hosts_tile';
import { ChartBaseProps } from '../chart/metric_chart_wrapper';

const KPI_CHARTS: KPIChartProps[] = [
  {
    type: 'cpu',
    trendLine: true,
    backgroundColor: '#F1D86F',
    title: i18n.translate('xpack.infra.hostsViewPage.metricTrend.cpu.title', {
      defaultMessage: 'CPU usage',
    }),
    subtitle: i18n.translate('xpack.infra.hostsViewPage.metricTrend.cpu.subtitle', {
      defaultMessage: 'Average',
    }),
    toolTip: i18n.translate('xpack.infra.hostsViewPage.metricTrend.cpu.tooltip', {
      defaultMessage:
        'Average of percentage of CPU time spent in states other than Idle and IOWait, normalized by the number of CPU cores. Includes both time spent on user space and kernel space. 100% means all CPUs of the host are busy.',
    }),
  },
  {
    type: 'memory',
    trendLine: true,
    backgroundColor: '#A987D1',
    title: i18n.translate('xpack.infra.hostsViewPage.metricTrend.memory.title', {
      defaultMessage: 'Memory usage',
    }),
    subtitle: i18n.translate('xpack.infra.hostsViewPage.metricTrend.memory.subtitle', {
      defaultMessage: 'Average',
    }),
    toolTip: i18n.translate('xpack.infra.hostsViewPage.metricTrend.memory.tooltip', {
      defaultMessage:
        "Average of percentage of main memory usage excluding page cache. This includes resident memory for all processes plus memory used by the kernel structures and code apart the page cache. A high level indicates a situation of memory saturation for a host. 100% means the main memory is entirely filled with memory that can't be reclaimed, except by swapping out.",
    }),
  },
  {
    type: 'rx',
    trendLine: true,
    backgroundColor: '#79AAD9',
    title: i18n.translate('xpack.infra.hostsViewPage.metricTrend.rx.title', {
      defaultMessage: 'Network inbound (RX)',
    }),
    subtitle: i18n.translate('xpack.infra.hostsViewPage.metricTrend.rx.subtitle', {
      defaultMessage: 'Average',
    }),
    toolTip: i18n.translate('xpack.infra.hostsViewPage.metricTrend.rx.tooltip', {
      defaultMessage:
        'Number of bytes which have been received per second on the public interfaces of the hosts.',
    }),
  },
  {
    type: 'tx',
    trendLine: true,
    backgroundColor: '#F5A35C',
    title: i18n.translate('xpack.infra.hostsViewPage.metricTrend.tx.title', {
      defaultMessage: 'Network outbound (TX)',
    }),
    subtitle: i18n.translate('xpack.infra.hostsViewPage.metricTrend.tx.subtitle', {
      defaultMessage: 'Average',
    }),
    toolTip: i18n.translate('xpack.infra.hostsViewPage.metricTrend.tx.tooltip', {
      defaultMessage:
        'Number of bytes which have been received per second on the public interfaces of the hosts.',
    }),
  },
];

const HOSTS_CHART: ChartBaseProps = {
  type: 'hostsCount',
  color: '#6DCCB1',
  metricType: 'value',
  title: i18n.translate('xpack.infra.hostsViewPage.metricTrend.hostCount.title', {
    defaultMessage: 'Hosts',
  }),
  trendA11yTitle: i18n.translate('xpack.infra.hostsViewPage.metricTrend.hostCount.a11y.title', {
    defaultMessage: 'Hosts count.',
  }),
  toolTip: i18n.translate('xpack.infra.hostsViewPage.metricTrend.hostCount.tooltip', {
    defaultMessage: 'The number of hosts returned by your current search criteria.',
  }),
  ['data-test-subj']: 'hostsView-metricsTrend-hosts',
};

export const KPIGrid = () => {
  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="s"
      style={{ flexGrow: 0 }}
      data-test-subj="hostsView-metricsTrend"
    >
      <EuiFlexItem>
        <HostsTile {...HOSTS_CHART} />
      </EuiFlexItem>
      {KPI_CHARTS.map(({ ...chartProp }) => (
        <EuiFlexItem key={chartProp.type}>
          <Tile {...chartProp} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
