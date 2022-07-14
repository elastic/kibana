/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useBreakpoints } from '../../../hooks/use_breakpoints';
import { BackendFailedTransactionRateChart } from './backend_error_rate_chart';
import { BackendLatencyChart } from './backend_latency_chart';
import { BackendMetricChartsRouteParams } from './backend_metric_charts_route_params';
import { BackendThroughputChart } from './backend_throughput_chart';

export function BackendMetricCharts() {
  const largeScreenOrSmaller = useBreakpoints().isLarge;

  const {
    query,
    query: {
      backendName,
      rangeFrom,
      rangeTo,
      kuery,
      environment,
      comparisonEnabled,
      offset,
    },
  } = useAnyOfApmParams('/backends/overview', '/backends/operation');

  const spanName = 'spanName' in query ? query.spanName : undefined;

  const props: BackendMetricChartsRouteParams = {
    backendName,
    rangeFrom,
    rangeTo,
    kuery,
    environment,
    comparisonEnabled,
    offset,
    spanName,
  };

  return (
    <EuiFlexGroup
      direction={largeScreenOrSmaller ? 'column' : 'row'}
      gutterSize="s"
    >
      <EuiFlexItem>
        <EuiPanel hasBorder={true}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.apm.backendDetailLatencyChartTitle', {
                defaultMessage: 'Latency',
              })}
            </h2>
          </EuiTitle>
          <BackendLatencyChart height={200} {...props} />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasBorder={true}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.apm.backendDetailThroughputChartTitle', {
                defaultMessage: 'Throughput',
              })}
            </h2>
          </EuiTitle>
          <BackendThroughputChart height={200} {...props} />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasBorder={true}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate(
                'xpack.apm.backendDetailFailedTransactionRateChartTitle',
                { defaultMessage: 'Failed transaction rate' }
              )}
            </h2>
          </EuiTitle>
          <BackendFailedTransactionRateChart height={200} {...props} />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
