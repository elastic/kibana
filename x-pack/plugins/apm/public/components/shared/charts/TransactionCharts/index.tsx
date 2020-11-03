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
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
  TRANSACTION_ROUTE_CHANGE,
} from '../../../../../common/transaction_types';
import { Coordinate } from '../../../../../typings/timeseries';
import { LicenseContext } from '../../../../context/LicenseContext';
import { IUrlParams } from '../../../../context/UrlParamsContext/types';
import { ITransactionChartData } from '../../../../selectors/chartSelectors';
import { asDecimal, tpmUnit } from '../../../../../common/utils/formatters';
import { isValidCoordinateValue } from '../../../../utils/isValidCoordinateValue';
import { ErroneousTransactionsRateChart } from '../erroneous_transactions_rate_chart/legacy';
import { TransactionBreakdown } from '../../TransactionBreakdown';
import {
  getResponseTimeTickFormatter,
  getResponseTimeTooltipFormatter,
} from './helper';
import { MLHeader } from './ml_header';
import { TransactionLineChart } from './TransactionLineChart';
import { useFormatter } from './use_formatter';

interface TransactionChartProps {
  charts: ITransactionChartData;
  urlParams: IUrlParams;
}

export function TransactionCharts({
  charts,
  urlParams,
}: TransactionChartProps) {
  const getTPMFormatter = (t: number) => {
    const unit = tpmUnit(urlParams.transactionType);
    return `${asDecimal(t)} ${unit}`;
  };

  const getTPMTooltipFormatter = (p: Coordinate) => {
    return isValidCoordinateValue(p.y)
      ? getTPMFormatter(p.y)
      : NOT_AVAILABLE_LABEL;
  };

  const { transactionType } = urlParams;

  const { responseTimeSeries, tpmSeries } = charts;

  const { formatter, setDisabledSeriesState } = useFormatter(
    responseTimeSeries
  );

  return (
    <>
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
                    hasValidMlLicense={license?.getFeature('ml').isAvailable}
                    mlJobId={charts.mlJobId}
                  />
                )}
              </LicenseContext.Consumer>
            </EuiFlexGroup>
            <TransactionLineChart
              series={responseTimeSeries}
              tickFormatY={getResponseTimeTickFormatter(formatter)}
              formatTooltipValue={getResponseTimeTooltipFormatter(formatter)}
              onToggleLegend={setDisabledSeriesState}
            />
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem style={{ flexShrink: 1 }}>
          <EuiPanel>
            <EuiTitle size="xs">
              <span>{tpmLabel(transactionType)}</span>
            </EuiTitle>
            <TransactionLineChart
              series={tpmSeries}
              tickFormatY={getTPMFormatter}
              formatTooltipValue={getTPMTooltipFormatter}
              truncateLegends
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>

      <EuiSpacer size="s" />

      <EuiFlexGrid columns={2} gutterSize="s">
        <EuiFlexItem>
          <ErroneousTransactionsRateChart />
        </EuiFlexItem>
        <EuiFlexItem>
          <TransactionBreakdown />
        </EuiFlexItem>
      </EuiFlexGrid>
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
