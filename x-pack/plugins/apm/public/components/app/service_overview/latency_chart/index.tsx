/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSelect, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { FETCH_STATUS } from '../../../../hooks/useFetcher';
import { useTransactionCharts } from '../../../../hooks/useTransactionCharts';
import { TimeseriesChart } from '../../../shared/charts/timeseries_chart';
import { getResponseTimeTickFormatter } from '../../../shared/charts/transaction_charts/helper';
import { useFormatter } from '../../../shared/charts/transaction_charts/use_formatter';

interface Props {
  height?: number;
}

export function LatencyChart({ height }: Props) {
  const [selectedOption, setSelectedOption] = useState(0);
  const { data, status } = useTransactionCharts();
  const { responseTimeSeries, anomalySeries } = data;
  const { formatter } = useFormatter(responseTimeSeries);
  const options = responseTimeSeries?.map(({ title }, index) => ({
    value: index,
    text: title,
  }));

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
              isLoading={status === FETCH_STATUS.LOADING}
              prepend={i18n.translate(
                'xpack.apm.serviceOverview.latencyChartTitle.prepend',
                { defaultMessage: 'Metric' }
              )}
              options={options}
              value={selectedOption}
              onChange={(nextOption) => {
                setSelectedOption(Number(nextOption.target.value));
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <TimeseriesChart
          anomalySeries={anomalySeries}
          height={height}
          fetchStatus={status}
          id="letency"
          timeseries={
            responseTimeSeries ? [responseTimeSeries[selectedOption]] : []
          }
          yLabelFormat={getResponseTimeTickFormatter(formatter)}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
