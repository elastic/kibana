/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiPage,
  EuiPageBody,
  EuiFlexGroup,
  EuiPageContent,
  EuiScreenReaderOnly,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { MonitoringTimeseriesContainer } from '../chart';
import { Status } from './instance/status';

const createCharts = (series: unknown[], props: any) => {
  return series.map((data, index) => {
    return (
      <EuiFlexItem style={{ minWidth: '45%' }} key={index}>
        <MonitoringTimeseriesContainer {...props} series={data} />
      </EuiFlexItem>
    );
  });
};

export const ApmMetrics = ({ stats, metrics, seriesToShow, title, ...props }) => {
  const topSeries = [metrics.apm_cpu, metrics.apm_memory, metrics.apm_os_load];
  const inAgent = stats.config?.container && stats.config?.agentMode;

  const topChartsTitle = inAgent
    ? i18n.translate('xpack.monitoring.apm.metrics.topCharts.agentTitle', {
        defaultMessage: 'Elastic Agent Group - Resource Usage',
      })
    : i18n.translate('xpack.monitoring.apm.metrics.topCharts.nonAgentTitle', {
        defaultMessage: 'APM Server - Resource Usage',
      });

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiScreenReaderOnly>
          <h1>
            <FormattedMessage
              id="xpack.monitoring.apm.metrics.heading"
              defaultMessage="APM server"
            />
          </h1>
        </EuiScreenReaderOnly>
        <EuiPanel>
          <Status stats={stats} />
        </EuiPanel>
        <EuiSpacer size="m" />
        <EuiPanel>
          <EuiTitle>
            <h3>{topChartsTitle}</h3>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiFlexGroup wrap>{createCharts(topSeries, props)}</EuiFlexGroup>
        </EuiPanel>
        <EuiSpacer size="m" />
        <EuiPageContent>
          <EuiTitle>
            <h3>{title}</h3>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiFlexGroup wrap>{createCharts(seriesToShow, props)}</EuiFlexGroup>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
