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
import { MetricsTile } from './tile';
import { MetricsHostsTile } from './hosts_tile';

export const MetricsTrend = () => {
  return (
    <EuiFlexGroup direction="row" gutterSize="s" style={{ flexGrow: 0 }}>
      <EuiFlexItem>
        <MetricsHostsTile
          type="hostsCount"
          metricType="value"
          color="#6DCCB1"
          title={i18n.translate('xpack.infra.hostsTable.averageCpuMetricTitle', {
            defaultMessage: 'Hosts',
          })}
          trendA11yTitle={i18n.translate('xpack.infra.hostsTable.trendA11yTitle', {
            defaultMessage: 'CPU usage over time.',
          })}
          toolTip={i18n.translate('xpack.infra.hostsTable.trendA11yTitle', {
            defaultMessage: 'The number of hosts returned by your current search criteria.',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <MetricsTile
          type="cpu"
          metricType="avg"
          color="#F1D86F"
          title={i18n.translate('xpack.infra.hostsTable.averageCpuMetricTitle', {
            defaultMessage: 'CPU usage',
          })}
          subtitle={i18n.translate('xpack.infra.hostsTable.average', {
            defaultMessage: 'Average',
          })}
          trendA11yTitle={i18n.translate('xpack.infra.hostsTable.trendA11yTitle', {
            defaultMessage: 'CPU usage over time.',
          })}
          trendA11yDescription={i18n.translate('xpack.infra.hostsTable.trendA11yDescription', {
            defaultMessage: 'A line chart showing the trend of the primary metric over time.',
          })}
          toolTip={i18n.translate('xpack.infra.hostsTable.trendA11yTitle', {
            defaultMessage:
              'Average of percentage of CPU time spent in states other than Idle and IOWait, normalized by the number of CPU cores. Includes both time spent on user space and kernel space. 100% means all CPUs of the host are busy.',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <MetricsTile
          type="memory"
          metricType="avg"
          color="#A987D1"
          title={i18n.translate('xpack.infra.hostsTable.averageMemoryMetricTitle', {
            defaultMessage: 'Memory usage',
          })}
          subtitle={i18n.translate('xpack.infra.hostsTable.average', {
            defaultMessage: 'Average',
          })}
          trendA11yTitle={i18n.translate('xpack.infra.hostsTable.trendA11yTitle', {
            defaultMessage: 'Memory usage over time.',
          })}
          trendA11yDescription={i18n.translate('xpack.infra.hostsTable.trendA11yDescription', {
            defaultMessage: 'A line chart showing the trend of the primary metric over time.',
          })}
          toolTip={i18n.translate('xpack.infra.hostsTable.trendA11yTitle', {
            defaultMessage:
              "Average of percentage of main memory usage excluding page cache. This includes resident memory for all processes plus memory used by the kernel structures and code apart the page cache. A high level indicates a situation of memory saturation for a host. 100% means the main memory is entirely filled with memory that can't be reclaimed, except by swapping out.",
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <MetricsTile
          type="rx"
          metricType="avg"
          color="#79AAD9"
          title={i18n.translate('xpack.infra.hostsTable.averageTxMetricTitle', {
            defaultMessage: 'Network inbound (RX)',
          })}
          subtitle={i18n.translate('xpack.infra.hostsTable.average', {
            defaultMessage: 'Average',
          })}
          trendA11yTitle={i18n.translate('xpack.infra.hostsTable.trendA11yTitle', {
            defaultMessage: 'Network inbound (RX) over time.',
          })}
          trendA11yDescription={i18n.translate('xpack.infra.hostsTable.trendA11yDescription', {
            defaultMessage: 'A line chart showing the trend of the primary metric over time.',
          })}
          toolTip={i18n.translate('xpack.infra.hostsTable.trendA11yTitle', {
            defaultMessage:
              'Number of bytes which have been received per second on the public interfaces of the hosts',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <MetricsTile
          type="tx"
          metricType="avg"
          color="#F5A35C"
          title={i18n.translate('xpack.infra.hostsTable.averageTxMetricTitle', {
            defaultMessage: 'Network outbound (TX) usage',
          })}
          subtitle={i18n.translate('xpack.infra.hostsTable.average', {
            defaultMessage: 'Average',
          })}
          trendA11yTitle={i18n.translate('xpack.infra.hostsTable.trendA11yTitle', {
            defaultMessage: 'Network outbound (TX) usage over time.',
          })}
          trendA11yDescription={i18n.translate('xpack.infra.hostsTable.trendA11yDescription', {
            defaultMessage: 'A line chart showing the trend of the primary metric over time.',
          })}
          toolTip={i18n.translate('xpack.infra.hostsTable.trendA11yTitle', {
            defaultMessage:
              'Number of bytes which have been sent per second on the public interfaces of the hosts',
          })}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
