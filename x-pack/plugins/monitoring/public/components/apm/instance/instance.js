/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MonitoringTimeseriesContainer } from '../../chart';
import { EuiFlexGrid, EuiFlexItem, EuiSpacer, EuiPage, EuiPageBody } from '@elastic/eui';
import { Status } from './status';

export function ApmServerInstance({ summary, metrics, ...props }) {
  const metricsToShow = [
    metrics.apm_cpu,
    metrics.apm_os_load,
    metrics.apm_output_events_rate,
    metrics.apm_requests,
    metrics.apm_incoming_requests_size,
    metrics.apm_memory,
    metrics.apm_transformations,
    metrics.apm_responses_success_failure
  ];

  return (
    <div>
      <Status stats={summary} />
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
