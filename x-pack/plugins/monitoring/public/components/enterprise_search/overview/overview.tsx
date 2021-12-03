/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiScreenReaderOnly,
  EuiPanel,
  EuiSpacer,
  EuiFlexGrid,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
// @ts-ignore
import { MonitoringTimeseriesContainer } from '../../chart';
import { Status } from './status';

export const EnterpriseSearchOverview: React.FC<any> = ({ metrics, stats, ...rest }) => {
  const lowLevelUsageMetrics = [
    metrics.enterprise_search_heap,
    metrics.enterprise_search_jvm_finalizer_queue,
    metrics.enterprise_search_gc_time,
    metrics.enterprise_search_gc_rate,
    metrics.enterprise_search_threads,
    metrics.enterprise_search_threads_rate,
  ];

  const networkMetrics = [
    metrics.enterprise_search_http_traffic,
    metrics.enterprise_search_http_responses,
    metrics.enterprise_search_http_connections_current,
    metrics.enterprise_search_http_connections_rate,
  ];

  const appSearchUsageMetrics = [metrics.app_search_total_engines, metrics.crawler_workers];

  const workplaceSearchUsageMetrics = [metrics.workplace_search_total_sources];

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiScreenReaderOnly>
          <h1>
            <FormattedMessage
              id="xpack.monitoring.entSearch.overview.heading"
              defaultMessage="Enterprise Search Overview"
            />
          </h1>
        </EuiScreenReaderOnly>
        <EuiSpacer size="m" />

        <EuiPanel>
          <Status stats={stats} />
        </EuiPanel>
        <EuiSpacer size="m" />

        <EuiPageContent>
          <EuiScreenReaderOnly>
            <h1>
              <FormattedMessage
                id="xpack.monitoring.entSearch.overview.networkingSummary"
                defaultMessage="Network Traffic Summary"
              />
            </h1>
          </EuiScreenReaderOnly>
          <EuiSpacer size="m" />

          <EuiFlexGrid columns={2} gutterSize="s">
            {networkMetrics.map((metric, index) => (
              <EuiFlexItem key={index}>
                <MonitoringTimeseriesContainer series={metric} {...rest} />
                <EuiSpacer />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </EuiPageContent>

        <EuiSpacer />

        <EuiPageContent>
          <EuiScreenReaderOnly>
            <h1>
              <FormattedMessage
                id="xpack.monitoring.entSearch.overview.lowLevelSummary"
                defaultMessage="Low Level Resource Usage Summary"
              />
            </h1>
          </EuiScreenReaderOnly>
          <EuiSpacer size="m" />

          <EuiFlexGrid columns={2} gutterSize="s">
            {lowLevelUsageMetrics.map((metric, index) => (
              <EuiFlexItem key={index}>
                <MonitoringTimeseriesContainer series={metric} {...rest} />
                <EuiSpacer />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </EuiPageContent>

        <EuiSpacer />

        <EuiPageContent>
          <EuiScreenReaderOnly>
            <h1>
              <FormattedMessage
                id="xpack.monitoring.entSearch.overview.appSearchSummary"
                defaultMessage="App Search Summary"
              />
            </h1>
          </EuiScreenReaderOnly>
          <EuiFlexGrid columns={2} gutterSize="s">
            {appSearchUsageMetrics.map((metric, index) => (
              <EuiFlexItem key={index}>
                <MonitoringTimeseriesContainer series={metric} {...rest} />
                <EuiSpacer />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </EuiPageContent>

        <EuiSpacer />

        <EuiPageContent>
          <EuiScreenReaderOnly>
            <h1>
              <FormattedMessage
                id="xpack.monitoring.entSearch.overview.workplaceSearchSummary"
                defaultMessage="Workplace Search Summary"
              />
            </h1>
          </EuiScreenReaderOnly>
          <EuiFlexGrid columns={2} gutterSize="s">
            {workplaceSearchUsageMetrics.map((metric, index) => (
              <EuiFlexItem key={index}>
                <MonitoringTimeseriesContainer series={metric} {...rest} />
                <EuiSpacer />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
