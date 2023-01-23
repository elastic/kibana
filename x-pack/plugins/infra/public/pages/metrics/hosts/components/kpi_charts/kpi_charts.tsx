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
import { Tile } from './tile';
import { HostsTile } from './hosts_tile';

export const KPICharts = () => {
  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="s"
      style={{ flexGrow: 0 }}
      data-test-subj="hostsView-metricsTrend"
    >
      <EuiFlexItem>
        <HostsTile
          type="hostsCount"
          metricType="value"
          color="#6DCCB1"
          title={i18n.translate('xpack.infra.hostsViewPage.metricTrend.hostCount.title', {
            defaultMessage: 'Hosts',
          })}
          trendA11yTitle={i18n.translate(
            'xpack.infra.hostsViewPage.metricTrend.hostCount.a11y.title',
            {
              defaultMessage: 'CPU usage over time.',
            }
          )}
          toolTip={i18n.translate('xpack.infra.hostsViewPage.metricTrend.hostCount.tooltip', {
            defaultMessage: 'The number of hosts returned by your current search criteria.',
          })}
          data-test-subj="hostsView-metricsTrend-hosts"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <Tile
          type="cpu"
          metricType="avg"
          color="#F1D86F"
          title={i18n.translate('xpack.infra.hostsViewPage.metricTrend.cpu.title', {
            defaultMessage: 'CPU usage',
          })}
          subtitle={i18n.translate('xpack.infra.hostsViewPage.metricTrend.cpu.subtitle', {
            defaultMessage: 'Average',
          })}
          trendA11yTitle={i18n.translate('xpack.infra.hostsViewPage.metricTrend.cpu.a11y.title', {
            defaultMessage: 'CPU usage over time.',
          })}
          trendA11yDescription={i18n.translate(
            'xpack.infra.hostsViewPage.metricTrend.cpu.a11y.description',
            {
              defaultMessage: 'A line chart showing the trend of the primary metric over time.',
            }
          )}
          toolTip={i18n.translate('xpack.infra.hostsViewPage.metricTrend.cpu.tooltip', {
            defaultMessage:
              'Average of percentage of CPU time spent in states other than Idle and IOWait, normalized by the number of CPU cores. Includes both time spent on user space and kernel space. 100% means all CPUs of the host are busy.',
          })}
          data-test-subj="hostsView-metricsTrend-cpu"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <Tile
          type="memory"
          metricType="avg"
          color="#A987D1"
          title={i18n.translate('xpack.infra.hostsViewPage.metricTrend.memory.title', {
            defaultMessage: 'Memory usage',
          })}
          subtitle={i18n.translate('xpack.infra.hostsViewPage.metricTrend.memory.subtitle', {
            defaultMessage: 'Average',
          })}
          trendA11yTitle={i18n.translate('xpack.infra.hostsViewPage.metricTrend.memory.a11yTitle', {
            defaultMessage: 'Memory usage over time.',
          })}
          trendA11yDescription={i18n.translate(
            'xpack.infra.hostsViewPage.metricTrend.memory.a11yDescription',
            {
              defaultMessage: 'A line chart showing the trend of the primary metric over time.',
            }
          )}
          toolTip={i18n.translate('xpack.infra.hostsViewPage.metricTrend.memory.tooltip', {
            defaultMessage:
              "Average of percentage of main memory usage excluding page cache. This includes resident memory for all processes plus memory used by the kernel structures and code apart the page cache. A high level indicates a situation of memory saturation for a host. 100% means the main memory is entirely filled with memory that can't be reclaimed, except by swapping out.",
          })}
          data-test-subj="hostsView-metricsTrend-memory"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <Tile
          type="rx"
          metricType="avg"
          color="#79AAD9"
          title={i18n.translate('xpack.infra.hostsViewPage.metricTrend.rx.title', {
            defaultMessage: 'Network inbound (RX)',
          })}
          subtitle={i18n.translate('xpack.infra.hostsViewPage.metricTrend.rx.subtitle', {
            defaultMessage: 'Average',
          })}
          trendA11yTitle={i18n.translate('xpack.infra.hostsViewPage.metricTrend.rx.a11y.title', {
            defaultMessage: 'Network inbound (RX) over time.',
          })}
          trendA11yDescription={i18n.translate(
            'xpack.infra.hostsViewPage.metricTrend.rx.a11y.description',
            {
              defaultMessage: 'A line chart showing the trend of the primary metric over time.',
            }
          )}
          toolTip={i18n.translate('xpack.infra.hostsViewPage.metricTrend.rx.tooltip', {
            defaultMessage:
              'Number of bytes which have been received per second on the public interfaces of the hosts.',
          })}
          data-test-subj="hostsView-metricsTrend-rx"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <Tile
          type="tx"
          metricType="avg"
          color="#F5A35C"
          title={i18n.translate('xpack.infra.hostsViewPage.metricTrend.tx.title', {
            defaultMessage: 'Network outbound (TX)',
          })}
          subtitle={i18n.translate('xpack.infra.hostsViewPage.metricTrend.tx.subtitle', {
            defaultMessage: 'Average',
          })}
          trendA11yTitle={i18n.translate('xpack.infra.hostsViewPage.metricTrend.tx.a11.title', {
            defaultMessage: 'Network outbound (TX) usage over time.',
          })}
          trendA11yDescription={i18n.translate(
            'xpack.infra.hostsViewPage.metricTrend.tx.a11y.description',
            {
              defaultMessage: 'A line chart showing the trend of the primary metric over time.',
            }
          )}
          toolTip={i18n.translate('xpack.infra.hostsViewPage.metricTrend.tx.tooltip', {
            defaultMessage:
              'Number of bytes which have been sent per second on the public interfaces of the hosts',
          })}
          data-test-subj="hostsView-metricsTrend-tx"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
