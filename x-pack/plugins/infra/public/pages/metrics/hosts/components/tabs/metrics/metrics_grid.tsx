/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';
import { HostMetricsDocsLink } from '../../../../../../common/visualizations/metric_explanation/host_metrics_docs_link';
import { MetricChart, MetricChartProps } from './metric_chart';

const DEFAULT_BREAKDOWN_SIZE = 20;
const CHARTS_IN_ORDER: Array<Pick<MetricChartProps, 'title' | 'type'> & { fullRow?: boolean }> = [
  {
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.cpuUsage', {
      defaultMessage: 'CPU Usage',
    }),
    type: 'cpuUsage',
  },
  {
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.normalizedLoad1m', {
      defaultMessage: 'Normalized Load',
    }),
    type: 'normalizedLoad1m',
  },
  {
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.memoryUsage', {
      defaultMessage: 'Memory Usage',
    }),
    type: 'memoryUsage',
  },
  {
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.memoryFree', {
      defaultMessage: 'Memory Free',
    }),
    type: 'memoryFree',
  },
  {
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.diskSpaceUsed', {
      defaultMessage: 'Disk Space Usage',
    }),
    type: 'diskSpaceUsage',
  },
  {
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.diskSpaceAvailable', {
      defaultMessage: 'Disk Space Available',
    }),
    type: 'diskSpaceAvailable',
  },
  {
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.diskIORead', {
      defaultMessage: 'Disk Read IOPS',
    }),
    type: 'diskIORead',
  },
  {
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.diskIOWrite', {
      defaultMessage: 'Disk Write IOPS',
    }),
    type: 'diskIOWrite',
  },
  {
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.diskReadThroughput', {
      defaultMessage: 'Disk Read Throughput',
    }),
    type: 'diskReadThroughput',
  },
  {
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.diskWriteThroughput', {
      defaultMessage: 'Disk Write Throughput',
    }),
    type: 'diskWriteThroughput',
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
];

export const MetricsGrid = React.memo(() => {
  return (
    <>
      <HostMetricsDocsLink />
      <EuiSpacer size="s" />
      <EuiFlexGrid columns={2} gutterSize="s" data-test-subj="hostsView-metricChart">
        {CHARTS_IN_ORDER.map(({ fullRow, ...chartProp }) => (
          <EuiFlexItem key={chartProp.type} style={fullRow ? { gridColumn: '1/-1' } : {}}>
            <MetricChart breakdownSize={DEFAULT_BREAKDOWN_SIZE} {...chartProp} />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </>
  );
});
