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
  const seriesToShow = [
    metrics.apm_responses_valid,
    metrics.apm_responses_errors,

    metrics.apm_output_events_rate_success,
    metrics.apm_output_events_rate_failure,

    metrics.apm_requests,
    metrics.apm_transformations,


    metrics.apm_cpu,
    metrics.apm_memory,

    metrics.apm_os_load,
  ];

  return (
    <div>
      <Status stats={summary} />
      <EuiPage style={{ backgroundColor: 'white' }}>
        <EuiPageBody>
          <EuiFlexGrid columns={2} gutterSize="none">
            {seriesToShow.map((metric, index) => (
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
