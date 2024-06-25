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
import { DependencyFailedTransactionRateChart } from './dependency_failed_transaction_rate_chart';
import { DependencyLatencyChart } from './dependency_latency_chart';
import { DependencyMetricChartsRouteParams } from './dependency_metric_charts_route_params';
import { DependencyThroughputChart } from './dependency_throughput_chart';

export function DependencyMetricCharts() {
  const largeScreenOrSmaller = useBreakpoints().isLarge;

  const {
    query,
    query: { dependencyName, rangeFrom, rangeTo, kuery, environment, comparisonEnabled, offset },
  } = useAnyOfApmParams('/dependencies/overview', '/dependencies/operation');

  const spanName = 'spanName' in query ? query.spanName : undefined;

  const props: DependencyMetricChartsRouteParams = {
    dependencyName,
    rangeFrom,
    rangeTo,
    kuery,
    environment,
    comparisonEnabled,
    offset,
    spanName,
  };

  return (
    <EuiFlexGroup direction={largeScreenOrSmaller ? 'column' : 'row'} gutterSize="s">
      <EuiFlexItem>
        <EuiPanel hasBorder={true}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.apm.dependencyDetailLatencyChartTitle', {
                defaultMessage: 'Latency',
              })}
            </h2>
          </EuiTitle>
          <DependencyLatencyChart height={200} {...props} />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasBorder={true}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.apm.dependencyDetailThroughputChartTitle', {
                defaultMessage: 'Throughput',
              })}
            </h2>
          </EuiTitle>
          <DependencyThroughputChart height={200} {...props} />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasBorder={true}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.apm.dependencyDetailFailedTransactionRateChartTitle', {
                defaultMessage: 'Failed transaction rate',
              })}
            </h2>
          </EuiTitle>
          <DependencyFailedTransactionRateChart height={200} {...props} />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
