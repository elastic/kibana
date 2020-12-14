/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
  TRANSACTION_ROUTE_CHANGE,
} from '../../../../../common/transaction_types';
import { asTransactionRate } from '../../../../../common/utils/formatters';
import { AnnotationsContextProvider } from '../../../../context/annotations/annotations_context';
import { ChartPointerEventContextProvider } from '../../../../context/chart_pointer_event/chart_pointer_event_context';
import { LicenseContext } from '../../../../context/license/license_context';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useTransactionLatencyChartsFetcher } from '../../../../hooks/use_transaction_latency_chart_fetcher';
import { useTransactionThroughputChartsFetcher } from '../../../../hooks/use_transaction_throughput_chart_fetcher';
import { TimeseriesChart } from '../timeseries_chart';
import { TransactionBreakdownChart } from '../transaction_breakdown_chart';
import { TransactionErrorRateChart } from '../transaction_error_rate_chart/';
import { getResponseTimeTickFormatter } from './helper';
import { MLHeader } from './ml_header';
import { useFormatter } from './use_formatter';

export function TransactionCharts() {
  const { urlParams } = useUrlParams();
  const { transactionType } = urlParams;

  const {
    latencyChartsData,
    latencyChartsStatus,
  } = useTransactionLatencyChartsFetcher();

  const {
    throughputChartsData,
    throughputChartsStatus,
  } = useTransactionThroughputChartsFetcher();

  const { latencyTimeseries, anomalyTimeseries, mlJobId } = latencyChartsData;
  const { throughputTimeseries } = throughputChartsData;

  const { formatter, toggleSerie } = useFormatter(latencyTimeseries);

  return (
    <>
      <AnnotationsContextProvider>
        <ChartPointerEventContextProvider>
          <EuiFlexGrid columns={2} gutterSize="s">
            <EuiFlexItem data-cy={`transaction-duration-charts`}>
              <EuiPanel>
                <EuiFlexGroup justifyContent="spaceBetween">
                  <EuiFlexItem>
                    <EuiTitle size="xs">
                      <span>{responseTimeLabel(transactionType)}</span>
                    </EuiTitle>
                  </EuiFlexItem>
                  <LicenseContext.Consumer>
                    {(license) => (
                      <MLHeader
                        hasValidMlLicense={
                          license?.getFeature('ml').isAvailable
                        }
                        mlJobId={mlJobId}
                      />
                    )}
                  </LicenseContext.Consumer>
                </EuiFlexGroup>
                <TimeseriesChart
                  fetchStatus={latencyChartsStatus}
                  id="transactionDuration"
                  timeseries={latencyTimeseries}
                  yLabelFormat={getResponseTimeTickFormatter(formatter)}
                  anomalySeries={anomalyTimeseries}
                  onToggleLegend={(serie) => {
                    if (serie) {
                      toggleSerie(serie);
                    }
                  }}
                />
              </EuiPanel>
            </EuiFlexItem>

            <EuiFlexItem style={{ flexShrink: 1 }}>
              <EuiPanel>
                <EuiTitle size="xs">
                  <span>{tpmLabel(transactionType)}</span>
                </EuiTitle>
                <TimeseriesChart
                  fetchStatus={throughputChartsStatus}
                  id="requestPerMinutes"
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

function tpmLabel(type?: string) {
  return type === TRANSACTION_REQUEST
    ? i18n.translate(
        'xpack.apm.metrics.transactionChart.requestsPerMinuteLabel',
        {
          defaultMessage: 'Requests per minute',
        }
      )
    : i18n.translate(
        'xpack.apm.metrics.transactionChart.transactionsPerMinuteLabel',
        {
          defaultMessage: 'Transactions per minute',
        }
      );
}

function responseTimeLabel(type?: string) {
  switch (type) {
    case TRANSACTION_PAGE_LOAD:
      return i18n.translate(
        'xpack.apm.metrics.transactionChart.pageLoadTimesLabel',
        {
          defaultMessage: 'Page load times',
        }
      );
    case TRANSACTION_ROUTE_CHANGE:
      return i18n.translate(
        'xpack.apm.metrics.transactionChart.routeChangeTimesLabel',
        {
          defaultMessage: 'Route change times',
        }
      );
    default:
      return i18n.translate(
        'xpack.apm.metrics.transactionChart.transactionDurationLabel',
        {
          defaultMessage: 'Transaction duration',
        }
      );
  }
}
