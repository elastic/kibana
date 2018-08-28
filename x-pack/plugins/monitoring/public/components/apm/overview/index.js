/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MonitoringTimeseriesContainer } from '../../chart';
import {
  EuiSpacer,
  EuiPage,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageBody,
  EuiPanel
} from '@elastic/eui';
import { Status } from '../instances/status';

export function ApmOverview({
  stats,
  metrics,
  ...props
}) {
  const seriesToShow = [
    metrics.apm_cpu,
    metrics.apm_os_load,
    metrics.apm_output_events_rate,
    metrics.apm_requests,
    metrics.apm_incoming_requests_size,
    metrics.apm_memory,
    metrics.apm_transformations,
    metrics.apm_responses_success_failure
  ];

  const charts = seriesToShow.map((data, index) => (
    <EuiFlexItem style={{ minWidth: '45%' }} key={index}>
      <EuiPanel>
        <MonitoringTimeseriesContainer
          series={data}
          {...props}
        />
      </EuiPanel>
    </EuiFlexItem>
  ));

  return (
    <EuiPage style={{ backgroundColor: 'white' }}>
      <EuiPageBody>
        <Status stats={stats}/>
        <EuiSpacer size="s"/>
        <EuiFlexGroup wrap>
          {charts}
        </EuiFlexGroup>
      </EuiPageBody>
    </EuiPage>
  );
}
