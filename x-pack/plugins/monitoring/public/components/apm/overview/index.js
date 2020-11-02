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
  EuiPanel,
  EuiPageContent,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { Status } from '../instances/status';
import { FormattedMessage } from '@kbn/i18n/react';

export function ApmOverview({ stats, metrics, alerts, ...props }) {
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

  const charts = seriesToShow.map((data, index) => (
    <EuiFlexItem style={{ minWidth: '45%' }} key={index}>
      <MonitoringTimeseriesContainer series={data} {...props} />
    </EuiFlexItem>
  ));

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiScreenReaderOnly>
          <h1>
            <FormattedMessage
              id="xpack.monitoring.apm.overview.heading"
              defaultMessage="APM server overview"
            />
          </h1>
        </EuiScreenReaderOnly>
        <EuiPanel>
          <Status stats={stats} alerts={alerts} />
        </EuiPanel>
        <EuiSpacer size="m" />
        <EuiPageContent>
          <EuiFlexGroup wrap>{charts}</EuiFlexGroup>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}
