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
import { TOOLTIP } from '../../translations';

const KPI_CHARTS: Array<Omit<KPIChartProps, 'loading' | 'subtitle'>> = [
  {
    type: 'cpu',
    trendLine: true,
    backgroundColor: '#F1D86F',
    title: i18n.translate('xpack.infra.hostsViewPage.metricTrend.cpu.title', {
      defaultMessage: 'CPU usage',
    }),
    toolTip: TOOLTIP.cpuUsage,
  },
  {
    type: 'memory',
    trendLine: true,
    backgroundColor: '#A987D1',
    title: i18n.translate('xpack.infra.hostsViewPage.metricTrend.memory.title', {
      defaultMessage: 'Memory usage',
    }),
    toolTip: TOOLTIP.memoryUsage,
  },
  {
    type: 'rx',
    trendLine: true,
    backgroundColor: '#79AAD9',
    title: i18n.translate('xpack.infra.hostsViewPage.metricTrend.rx.title', {
      defaultMessage: 'Network inbound (RX)',
    }),
    toolTip: TOOLTIP.rx,
  },
  {
    type: 'tx',
    trendLine: true,
    backgroundColor: '#F5A35C',
    title: i18n.translate('xpack.infra.hostsViewPage.metricTrend.tx.title', {
      defaultMessage: 'Network outbound (TX)',
    }),
    toolTip: TOOLTIP.tx,
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
