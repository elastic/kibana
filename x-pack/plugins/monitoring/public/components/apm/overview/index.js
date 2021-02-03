/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
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
  EuiTitle,
} from '@elastic/eui';
import { Status } from '../instances/status';
import { FormattedMessage } from '@kbn/i18n/react';

export function ApmOverview({ stats, metrics, alerts, ...props }) {
  const topSeries = [metrics.apm_cpu, metrics.apm_memory, metrics.apm_os_load];
  const seriesToShow = [
    metrics.apm_responses_valid,
    metrics.apm_responses_errors,

    metrics.apm_output_events_rate_success,
    metrics.apm_output_events_rate_failure,

    metrics.apm_requests,
    metrics.apm_transformations,
  ];

  const topCharts = topSeries.map((data, index) => (
    <EuiFlexItem style={{ minWidth: '45%' }} key={index}>
      <MonitoringTimeseriesContainer series={data} {...props} />
    </EuiFlexItem>
  ));

  const charts = seriesToShow.map((data, index) => (
    <EuiFlexItem style={{ minWidth: '45%' }} key={index}>
      <MonitoringTimeseriesContainer series={data} {...props} />
    </EuiFlexItem>
  ));

  const inAgent = stats.config && stats.config.container && stats.config.agentMode;

  const topChartsTitle = inAgent
    ? i18n.translate('xpack.monitoring.apm.overview.topCharts.agentTitle', {
        defaultMessage: 'Elastic Agent Group - Resource Usage',
      })
    : i18n.translate('xpack.monitoring.apm.overview.topCharts.nonAgentTitle', {
        defaultMessage: 'APM Server - Resource Usage',
      });

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
        <EuiPanel>
          <EuiTitle>
            <h3>{topChartsTitle}</h3>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiFlexGroup wrap>{topCharts}</EuiFlexGroup>
        </EuiPanel>
        <EuiSpacer size="m" />
        <EuiPageContent>
          <EuiTitle>
            <h3>
              {i18n.translate('xpack.monitoring.apm.overview.panels.title', {
                defaultMessage: 'APM Server - Custom Metrics',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiFlexGroup wrap>{charts}</EuiFlexGroup>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}
