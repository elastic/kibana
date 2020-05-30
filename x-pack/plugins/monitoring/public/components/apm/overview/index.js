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

export function ApmOverview({ stats, metrics, ...props }) {
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
      <EuiPanel>
        <MonitoringTimeseriesContainer series={data} {...props} />
      </EuiPanel>
    </EuiFlexItem>
  ));

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiScreenReaderOnly>
          <h1>
            <FormattedMessage
              id="xpack.monitoring.apm.overview.heading"
              defaultMessage="APM Overview"
            />
          </h1>
        </EuiScreenReaderOnly>
        <EuiPageContent>
          <Status stats={stats} />
          <EuiSpacer size="s" />
          <EuiFlexGroup wrap>{charts}</EuiFlexGroup>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}
