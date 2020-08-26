/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import { flatten, isEmpty } from 'lodash';
import React from 'react';
import styled from 'styled-components';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
  TRANSACTION_ROUTE_CHANGE,
} from '../../../../../common/transaction_types';
import { Coordinate, TimeSeries } from '../../../../../typings/timeseries';
import { LicenseContext } from '../../../../context/LicenseContext';
import { IUrlParams } from '../../../../context/UrlParamsContext/types';
import { ITransactionChartData } from '../../../../selectors/chartSelectors';
import {
  asDecimal,
  getDurationFormatter,
  tpmUnit,
} from '../../../../utils/formatters';
import { isValidCoordinateValue } from '../../../../utils/isValidCoordinateValue';
import { MLJobLink } from '../../Links/MachineLearningLinks/MLJobLink';
import { BrowserLineChart } from './BrowserLineChart';
import { DurationByCountryMap } from './DurationByCountryMap';
import { TransactionLineChart } from './TransactionLineChart';

interface TransactionChartProps {
  charts: ITransactionChartData;
  location: Location;
  urlParams: IUrlParams;
}

const ShiftedIconWrapper = styled.span`
  padding-right: 5px;
  position: relative;
  top: -1px;
  display: inline-block;
`;

const ShiftedEuiText = styled(EuiText)`
  position: relative;
  top: 5px;
`;

export function getMaxY(responseTimeSeries: TimeSeries[]) {
  const coordinates = flatten(
    responseTimeSeries.map((serie: TimeSeries) => serie.data as Coordinate[])
  );

  const numbers: number[] = coordinates.map((c: Coordinate) => (c.y ? c.y : 0));

  return Math.max(...numbers, 0);
}

export function TransactionCharts({
  charts,
  location,
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

  function renderMLHeader(hasValidMlLicense: boolean | undefined) {
    const { mlJobId } = charts;

    if (!hasValidMlLicense || !mlJobId) {
      return null;
    }

    const { serviceName, kuery, transactionType } = urlParams;
    if (!serviceName) {
      return null;
    }

    const hasKuery = !isEmpty(kuery);
    const icon = hasKuery ? (
      <EuiIconTip
        aria-label="Warning"
        type="alert"
        color="warning"
        content="The Machine learning results are hidden when the search bar is used for filtering"
      />
    ) : (
      <EuiIconTip
        content={i18n.translate(
          'xpack.apm.metrics.transactionChart.machineLearningTooltip',
          {
            defaultMessage:
              'The stream around the average duration shows the expected bounds. An annotation is shown for anomaly scores ≥ 75.',
          }
        )}
      />
    );

    return (
      <EuiFlexItem grow={false}>
        <ShiftedEuiText size="xs">
          <ShiftedIconWrapper>{icon}</ShiftedIconWrapper>
          <span>
            {i18n.translate(
              'xpack.apm.metrics.transactionChart.machineLearningLabel',
              {
                defaultMessage: 'Machine learning:',
              }
            )}{' '}
          </span>
          <MLJobLink
            jobId={mlJobId}
            serviceName={serviceName}
            transactionType={transactionType}
          >
            View Job
          </MLJobLink>
        </ShiftedEuiText>
      </EuiFlexItem>
    );
  }
  const { responseTimeSeries, tpmSeries } = charts;
  const { transactionType } = urlParams;
  const maxY = getMaxY(responseTimeSeries);
  let formatter = getDurationFormatter(maxY);

  function onToggleLegend(visibleSeries: TimeSeries[]) {
    if (!isEmpty(visibleSeries)) {
      // recalculate the formatter based on the max Y from the visible series
      const maxVisibleY = getMaxY(visibleSeries);
      formatter = getDurationFormatter(maxVisibleY);
    }
  }

  function getResponseTimeTickFormatter(t: number) {
    return formatter(t).formatted;
  }

  function getResponseTimeTooltipFormatter(coordinate: Coordinate) {
    return isValidCoordinateValue(coordinate.y)
      ? formatter(coordinate.y).formatted
      : NOT_AVAILABLE_LABEL;
  }

  return (
    <>
      <EuiFlexGrid columns={2} gutterSize="s">
        <EuiFlexItem data-cy={`transaction-duration-charts`}>
          <EuiPanel>
            <React.Fragment>
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <span>{responseTimeLabel(transactionType)}</span>
                  </EuiTitle>
                </EuiFlexItem>
                <LicenseContext.Consumer>
                  {(license) =>
                    renderMLHeader(license?.getFeature('ml').isAvailable)
                  }
                </LicenseContext.Consumer>
              </EuiFlexGroup>
              <TransactionLineChart
                series={responseTimeSeries}
                tickFormatY={getResponseTimeTickFormatter}
                formatTooltipValue={getResponseTimeTooltipFormatter}
                onToggleLegend={onToggleLegend}
              />
            </React.Fragment>
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem style={{ flexShrink: 1 }}>
          <EuiPanel>
            <React.Fragment>
              <EuiTitle size="xs">
                <span>{tpmLabel(transactionType)}</span>
              </EuiTitle>
              <TransactionLineChart
                series={tpmSeries}
                tickFormatY={getTPMFormatter}
                formatTooltipValue={getTPMTooltipFormatter}
                truncateLegends
              />
            </React.Fragment>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
      {transactionType === TRANSACTION_PAGE_LOAD && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGrid columns={2} gutterSize="s">
            <EuiFlexItem>
              <EuiPanel>
                <DurationByCountryMap />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel>
                <BrowserLineChart />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGrid>
        </>
      )}
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
