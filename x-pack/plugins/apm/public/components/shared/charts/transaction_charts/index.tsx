/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { asTransactionRate } from '../../../../../common/utils/formatters';
import { AnnotationsContextProvider } from '../../../../context/annotations/annotations_context';
import { ChartPointerEventContextProvider } from '../../../../context/chart_pointer_event/chart_pointer_event_context';
import { useTransactionThroughputChartsFetcher } from '../../../../hooks/use_transaction_throughput_chart_fetcher';
import { LatencyChart } from '../latency_chart';
import { TimeseriesChart } from '../timeseries_chart';
import { TransactionBreakdownChart } from '../transaction_breakdown_chart';
import { TransactionErrorRateChart } from '../transaction_error_rate_chart/';

export function TransactionCharts() {
  const {
    throughputChartsData,
    throughputChartsStatus,
  } = useTransactionThroughputChartsFetcher();

  const { throughputTimeseries } = throughputChartsData;

  return (
    <>
      <AnnotationsContextProvider>
        <ChartPointerEventContextProvider>
          <EuiFlexGrid columns={2} gutterSize="s">
            <EuiFlexItem data-cy={`transaction-duration-charts`}>
              <EuiPanel hasBorder={true}>
                <LatencyChart />
              </EuiPanel>
            </EuiFlexItem>

            <EuiFlexItem style={{ flexShrink: 1 }}>
              <EuiPanel hasBorder={true}>
                <EuiTitle size="xs">
                  <span>
                    {i18n.translate(
                      'xpack.apm.metrics.transactionChart.throughputLabel',
                      { defaultMessage: 'Throughput' }
                    )}
                  </span>
                </EuiTitle>
                <TimeseriesChart
                  fetchStatus={throughputChartsStatus}
                  id="transactionsPerMinute"
                  timeseries={throughputTimeseries}
                  yLabelFormat={asTransactionRate}
                />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGrid>

          <EuiSpacer size="s" />

          <EuiFlexGrid columns={2} gutterSize="s">
            <EuiFlexItem>
              <TransactionErrorRateChart />
            </EuiFlexItem>
            <EuiFlexItem>
              <TransactionBreakdownChart />
            </EuiFlexItem>
          </EuiFlexGrid>
        </ChartPointerEventContextProvider>
      </AnnotationsContextProvider>
    </>
  );
}
