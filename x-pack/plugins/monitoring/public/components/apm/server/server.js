/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MonitoringTimeseriesContainer } from '../../chart';
import { EuiFlexGrid, EuiFlexItem, EuiSpacer, EuiPage, EuiPageBody } from '@elastic/eui';

export function ApmServer({  metrics, ...props }) {
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
  );
}
