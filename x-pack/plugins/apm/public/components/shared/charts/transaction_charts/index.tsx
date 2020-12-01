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
import { AnnotationsContextProvider } from '../../../../context/annotations_context';
import { ChartPointerEventContextProvider } from '../../../../context/chart_pointer_event_context';
import { LicenseContext } from '../../../../context/LicenseContext';
import { IUrlParams } from '../../../../context/UrlParamsContext/types';
import { FETCH_STATUS } from '../../../../hooks/useFetcher';
import { ITransactionChartData } from '../../../../selectors/chart_selectors';
import { TimeseriesChart } from '../timeseries_chart';
import { TransactionBreakdownChart } from '../transaction_breakdown_chart';
import { TransactionErrorRateChart } from '../transaction_error_rate_chart/';
import { getResponseTimeTickFormatter } from './helper';
import { MLHeader } from './ml_header';
import { useFormatter } from './use_formatter';

interface TransactionChartProps {
  charts: ITransactionChartData;
  urlParams: IUrlParams;
  fetchStatus: FETCH_STATUS;
}

export function TransactionCharts({
  charts,
  urlParams,
  fetchStatus,
}: TransactionChartProps) {
  const { transactionType } = urlParams;

  const { responseTimeSeries, tpmSeries, anomalySeries } = charts;

  const { formatter, toggleSerie } = useFormatter(responseTimeSeries);

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
                        mlJobId={charts.mlJobId}
                      />
                    )}
                  </LicenseContext.Consumer>
                </EuiFlexGroup>
                <TimeseriesChart
                  fetchStatus={fetchStatus}
                  id="transactionDuration"
                  timeseries={responseTimeSeries || []}
                  yLabelFormat={getResponseTimeTickFormatter(formatter)}
                  anomalySeries={anomalySeries}
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
                  fetchStatus={fetchStatus}
                  id="requestPerMinutes"
                  timeseries={tpmSeries || []}
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
