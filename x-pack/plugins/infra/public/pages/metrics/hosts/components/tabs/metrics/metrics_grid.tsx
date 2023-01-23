/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiFlexGrid, EuiFlexItem, EuiFlexGroup, EuiText, EuiI18n } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MetricChart } from './metric_chart';

const DEFAULT_BREAKDOWN_SIZE = 20;

export const MetricsGrid = () => {
  return (
    <>
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
            <EuiFlexItem>
              <MetricChart
                type="load"
                title={i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.load', {
                  defaultMessage: 'Normalized Load',
                })}
                breakdownSize={DEFAULT_BREAKDOWN_SIZE}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <MetricChart
                type="cpu"
                title={i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.cpu', {
                  defaultMessage: 'CPU Usage',
                })}
                breakdownSize={DEFAULT_BREAKDOWN_SIZE}
              />
            </EuiFlexItem>
            <EuiFlexItem style={{ gridColumn: '1/-1' }}>
              <MetricChart
                type="memory"
                title={i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.memory', {
                  defaultMessage: 'Memory Usage',
                })}
                breakdownSize={DEFAULT_BREAKDOWN_SIZE}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <MetricChart
                type="rx"
                title={i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.rx', {
                  defaultMessage: 'Network Inbound (RX)',
                })}
                breakdownSize={DEFAULT_BREAKDOWN_SIZE}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <MetricChart
                type="tx"
                title={i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.tx', {
                  defaultMessage: 'Network Outbound (TX)',
                })}
                breakdownSize={DEFAULT_BREAKDOWN_SIZE}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <MetricChart
                type="diskIORead"
                title={i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.diskIORead', {
                  defaultMessage: 'Disk Read IOPS',
                })}
                breakdownSize={DEFAULT_BREAKDOWN_SIZE}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <MetricChart
                type="diskIOWrite"
                title={i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.DiskIOWrite', {
                  defaultMessage: 'Disk Write IOPS',
                })}
                breakdownSize={DEFAULT_BREAKDOWN_SIZE}
              />
            </EuiFlexItem>
          </EuiFlexGrid>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
