/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MetricChart, MetricChartProps } from './metric_chart';

const DEFAULT_BREAKDOWN_SIZE = 20;
const CHARTS_IN_ORDER: Array<Pick<MetricChartProps, 'title' | 'type'> & { fullRow?: boolean }> = [
  {
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.load', {
      defaultMessage: 'Normalized Load',
    }),
    type: 'load',
  },
  {
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.cpu', {
      defaultMessage: 'CPU Usage',
    }),
    type: 'cpu',
  },
  {
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.memory', {
      defaultMessage: 'Memory Usage',
    }),
    type: 'memory',
  },
  {
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.memoryAvailable', {
      defaultMessage: 'Memory Available',
    }),
    type: 'memoryAvailable',
  },
  {
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.rx', {
      defaultMessage: 'Network Inbound (RX)',
    }),
    type: 'rx',
  },
  {
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.tx', {
      defaultMessage: 'Network Outbound (TX)',
    }),
    type: 'tx',
  },
  {
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.diskIORead', {
      defaultMessage: 'Disk Read IOPS',
    }),
    type: 'diskIORead',
  },
  {
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.DiskIOWrite', {
      defaultMessage: 'Disk Write IOPS',
    }),
    type: 'diskIOWrite',
  },
];

export const MetricsGrid = React.memo(() => {
  return (
    <EuiFlexGrid columns={2} gutterSize="s">
      {CHARTS_IN_ORDER.map(({ fullRow, ...chartProp }) => (
        <EuiFlexItem key={chartProp.type} style={fullRow ? { gridColumn: '1/-1' } : {}}>
          <MetricChart breakdownSize={DEFAULT_BREAKDOWN_SIZE} {...chartProp} />
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );
});
