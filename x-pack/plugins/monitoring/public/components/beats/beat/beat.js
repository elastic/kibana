/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MonitoringTimeseriesContainer } from '../../chart';
import { formatMetric } from '../../../lib/format_number';
import { EuiFlexItem, EuiFlexGroup, EuiPage, EuiPageBody, EuiFlexGrid, EuiSpacer } from '@elastic/eui';

export function Beat({ summary, metrics, ...props }) {

  const metricsToShow = [
    metrics.beat_event_rates,
    metrics.beat_fail_rates,
    metrics.beat_throughput_rates,
    metrics.beat_output_errors,
    metrics.beat_memory,
    metrics.beat_cpu_utilization,
    metrics.beat_os_load,
    metrics.beat_handles,
  ];

  const wrapChild = ({ label, value, dataTestSubj }, index) => (
    <EuiFlexItem
      key={`summary-status-item-${index}`}
      grow={false}
      data-test-subj={dataTestSubj}
    >
      <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          {label ? label + ': ' : null}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <strong>{value}</strong>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );

  const summarytStatsTop = [
    { label: 'Name', value: summary.name, dataTestSubj: 'name' },
    { label: 'Host', value: summary.transportAddress, dataTestSubj: 'host' },
    { label: 'Version', value: summary.version, dataTestSubj: 'version' },
    { label: 'Type', value: summary.type, dataTestSubj: 'type' },
    { label: 'Output', value: summary.output, dataTestSubj: 'output' },
    { label: 'Config reloads', value: formatMetric(summary.configReloads, 'int_commas'), dataTestSubj: 'configReloads' },
    { label: 'Uptime', value: formatMetric(summary.uptime, 'time_since'), dataTestSubj: 'uptime' },
  ];

  const summarytStatsBot = [
    { label: 'Events total', value: formatMetric(summary.eventsTotal, 'int_commas'), dataTestSubj: 'eventsTotal' },
    { label: 'Events emitted', value: formatMetric(summary.eventsEmitted, 'int_commas'), dataTestSubj: 'eventsEmitted' },
    { label: 'Events dropped', value: formatMetric(summary.eventsDropped, 'int_commas'), dataTestSubj: 'eventsDropped' },
    { label: 'Bytes sent', value: formatMetric(summary.bytesWritten, 'byte'), dataTestSubj: 'bytesWritten' },
    { label: 'Handles limit (soft)', value: formatMetric(summary.handlesSoftLimit, 'byte'), dataTestSubj: 'handlesLimitSoft' },
    { label: 'Handles limit (hard)', value: formatMetric(summary.handlesHardLimit, 'byte'), dataTestSubj: 'handlesLimitHard' },
  ];

  return (
    <div>
      <div className="monSummaryStatus" role="status">
        <div {...props}>
          <EuiFlexGroup gutterSize="none" alignItems="center" data-test-subj="beatSummaryStatus01">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup>
                {summarytStatsTop.map(wrapChild)}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>

      <div className="monSummaryStatus" role="status">
        <div {...props}>
          <EuiFlexGroup gutterSize="none" alignItems="center" data-test-subj="beatSummaryStatus02">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup>
                {summarytStatsBot.map(wrapChild)}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>

      <EuiPage style={{ backgroundColor: 'white' }}>
        <EuiPageBody>
          <EuiFlexGrid columns={2} gutterSize="none">
            {metricsToShow.map((metric, index) => (
              <EuiFlexItem key={index} style={{ width: '50%' }}>
                <MonitoringTimeseriesContainer
                  series={metric}
                  {...props}
                />
                <EuiSpacer size="m"/>
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </EuiPageBody>
      </EuiPage>
    </div>
  );
}
