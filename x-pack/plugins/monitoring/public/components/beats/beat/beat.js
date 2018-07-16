/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { MonitoringTimeseriesContainer } from 'plugins/monitoring/components';
import { formatMetric } from 'plugins/monitoring/lib/format_number';
import { EuiFlexGrid, EuiFlexItem, EuiSpacer } from '@elastic/eui';

function renderTransportAddress(summary) {
  let output = null;
  if (summary.name !== summary.transportAddress) {
    output = (
      <Fragment>
        Host: <strong data-test-subj="host">{summary.transportAddress}</strong>
      </Fragment>
    );
  }
  return output;
}

export function Beat({ summary, metrics, ...props }) {
  const metricsToShow = [
    metrics.beat_event_rates,
    metrics.beat_fail_rates,
    metrics.beat_throughput_rates,
    metrics.beat_output_errors,
    metrics.beat_memory,
    metrics.beat_cpu_utilization,
    metrics.beat_os_load,
  ];

  return (
    <div>
      <div role="status">
        <div className="monitoring-summary-status">
          <div
            className="monitoring-summary-status__content"
            data-test-subj="beatSummaryStatus01"
          >
            <div>
              <strong data-test-subj="name">{summary.name}</strong>
            </div>
            <div>
              Version:{' '}
              <strong data-test-subj="version">{summary.version}</strong>
            </div>
            <div>
              Beat Type: <strong data-test-subj="type">{summary.type}</strong>
            </div>
            {renderTransportAddress(summary)}
            <div>
              Output: <strong data-test-subj="output">{summary.output}</strong>
            </div>
            <div>
              Config Reloads:{' '}
              <strong data-test-subj="configReloads">
                {formatMetric(summary.configReloads, 'int_commas')}
              </strong>
            </div>
            <div>
              Uptime:{' '}
              <strong data-test-subj="uptime">
                {formatMetric(summary.uptime, 'time_since')}
              </strong>
            </div>
          </div>
        </div>

        <div className="monitoring-summary-status" role="status">
          <div
            className="monitoring-summary-status__content"
            data-test-subj="beatSummaryStatus02"
          >
            <div>
              Events Total:{' '}
              <strong data-test-subj="eventsTotal">
                {formatMetric(summary.eventsTotal, 'int_commas')}
              </strong>
            </div>
            <div>
              Events Emitted:{' '}
              <strong data-test-subj="eventsEmitted">
                {formatMetric(summary.eventsEmitted, 'int_commas')}
              </strong>
            </div>
            <div>
              Events Dropped:{' '}
              <strong data-test-subj="eventsDropped">
                {formatMetric(summary.eventsDropped, 'int_commas')}
              </strong>
            </div>
            <div>
              Bytes Sent:{' '}
              <strong data-test-subj="bytesWritten">
                {formatMetric(summary.bytesWritten, 'byte')}
              </strong>
            </div>
          </div>
        </div>
      </div>

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
    </div>
  );
}
