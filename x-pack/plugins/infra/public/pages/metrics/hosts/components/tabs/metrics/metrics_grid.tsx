/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiFlexGrid, EuiFlexItem, EuiFlexGroup, EuiText, EuiI18n } from '@elastic/eui';
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
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.load', {
      defaultMessage: 'CPU Usage',
    }),
    type: 'cpu',
  },
  {
    title: i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.memory', {
      defaultMessage: 'Memory Usage',
    }),
    type: 'memory',
    fullRow: true,
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

export const MetricsGrid = () => {
  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="hostsView-metricChart">
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="spaceBetween" wrap={false} alignItems="center">
          <EuiFlexItem grow={false} style={{ flex: 1 }}>
            <EuiText size="xs">
              <EuiI18n
                token="xpack.infra.hostsViewPage.tabs.metricsCharts.cpuCores"
                default="Showing for Top {maxHosts} hosts by {attribute}"
                values={{
                  maxHosts: <strong>{DEFAULT_BREAKDOWN_SIZE}</strong>,
                  attribute: <strong>name</strong>,
                }}
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGrid columns={2} gutterSize="s">
          {CHARTS_IN_ORDER.map(({ fullRow, ...chartProp }) => (
            <EuiFlexItem style={fullRow ? { gridColumn: '1/-1' } : {}}>
              <MetricChart breakdownSize={DEFAULT_BREAKDOWN_SIZE} {...chartProp} />
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
