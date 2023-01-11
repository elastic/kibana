/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiPanel,
  EuiTitle,
  EuiIconTip,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { TimeseriesChartWithContext } from '../../../shared/charts/timeseries_chart_with_context';
import { getComparisonChartTheme } from '../../../shared/time_comparison/get_comparison_chart_theme';
import {
  getTimeSeriesColor,
  ChartType,
} from '../../../shared/charts/helper/get_timeseries_color';
const INITIAL_STATE = {
  timeseries: [],
};

function yLabelFormat(y?: number | null) {
  return y;
}

type SessionsChart =
  APIReturnType<'GET /internal/apm/mobile-services/{serviceName}/transactions/charts/sessions'>;
export function SessionsChart({
  kuery,
  serviceName,
  start,
  end,
  transactionType,
  transactionName,
  environment,
}: {
  kuery: string;
  serviceName: string;
  start: string;
  end: string;
  transactionType?: string;
  transactionName?: string;
  environment: string;
}) {
  const comparisonChartTheme = getComparisonChartTheme();
  const { currentPeriodColor } = getTimeSeriesColor(ChartType.SESSIONS);

  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      return callApmApi(
        'GET /internal/apm/mobile-services/{serviceName}/transactions/charts/sessions',
        {
          params: {
            path: {
              serviceName,
            },
            query: {
              environment,
              kuery,
              start,
              end,
              transactionType,
              transactionName,
            },
          },
        }
      );
    },
    [
      environment,
      kuery,
      serviceName,
      start,
      end,
      transactionType,
      transactionName,
    ]
  );

  const timeseries = [
    {
      data: data.timeseries,
      type: 'linemark',
      color: currentPeriodColor,
      title: i18n.translate('xpack.apm.transactions.sessionsChartTitle', {
        defaultMessage: 'Sessions',
      }),
    },
  ];
  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.apm.transactions.sessionsChartTitle', {
                defaultMessage: 'Sessions',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiIconTip
            content={i18n.translate(
              'xpack.apm.transactions.sessionsCharTooltip',
              {
                defaultMessage: 'Unique sessions id',
              }
            )}
            position="right"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <TimeseriesChartWithContext
        id="throughput"
        showAnnotations={false}
        fetchStatus={status}
        timeseries={timeseries}
        customTheme={comparisonChartTheme}
        yLabelFormat={(y) => `${y}`}
      />
    </EuiPanel>
  );
}
