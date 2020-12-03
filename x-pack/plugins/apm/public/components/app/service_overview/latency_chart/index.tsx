/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSelect, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useTransactionChartsFetcher } from '../../../../hooks/use_transaction_charts_fetcher';
import { TimeseriesChart } from '../../../shared/charts/timeseries_chart';
import { getResponseTimeTickFormatter } from '../../../shared/charts/transaction_charts/helper';
import { useFormatter } from '../../../shared/charts/transaction_charts/use_formatter';
import * as urlHelpers from '../../../shared/Links/url_helpers';

interface Props {
  height?: number;
}

export type AggregationType = 'avg' | 'p95' | 'p99';

const options: Array<{ value: AggregationType; text: string }> = [
  { value: 'avg', text: 'Average' },
  { value: 'p95', text: '95th percentile' },
  { value: 'p99', text: '99th percentile' },
];

export function LatencyChart({ height }: Props) {
  const history = useHistory();
  const { urlParams } = useUrlParams();
  const { aggregationType } = urlParams;

  const {
    transactionChartsData,
    transactionChartsStatus,
  } = useTransactionChartsFetcher();
  // const { responseTimeSeries, anomalySeries } = transactionChartsData;

  // const timeSeries = responseTimeSeries
  //   ? [responseTimeSeries[selectedOption]]
  //   : [];
  // const { formatter } = useFormatter(timeSeries);
  // const options = responseTimeSeries?.map(({ title }, index) => ({
  //   value: index,
  //   text: title,
  // }));

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.apm.serviceOverview.latencyChartTitle', {
                  defaultMessage: 'Latency',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSelect
              compressed
              // isLoading={transactionChartsStatus === FETCH_STATUS.LOADING}
              prepend={i18n.translate(
                'xpack.apm.serviceOverview.latencyChartTitle.prepend',
                { defaultMessage: 'Metric' }
              )}
              options={options}
              value={aggregationType}
              onChange={(nextOption) => {
                urlHelpers.push(history, {
                  query: { aggregationType: nextOption.target.value },
                });
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        {/* <TimeseriesChart
          anomalySeries={anomalySeries}
          height={height}
          fetchStatus={status}
          id="letency"
          timeseries={timeSeries}
          yLabelFormat={getResponseTimeTickFormatter(formatter)}
        /> */}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
