/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPanel,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { asPercent } from '../../../../../common/utils/formatters';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useTheme } from '../../../../hooks/use_theme';
import { TimeseriesChart } from '../timeseries_chart';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import {
  getComparisonChartTheme,
  getTimeRangeComparison,
} from '../../time_comparison/get_time_range_comparison';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { TimeRangeComparisonType } from '../../../../../common/runtime_types/comparison_type_rt';

function yLabelFormat(y?: number | null) {
  return asPercent(y || 0, 1);
}

interface Props {
  height?: number;
  showAnnotations?: boolean;
  kuery: string;
  environment: string;
  transactionName?: string;
  comparisonEnabled?: boolean;
  comparisonType?: TimeRangeComparisonType;
}

type ColdstartRate =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate'>;

const INITIAL_STATE: ColdstartRate = {
  currentPeriod: {
    transactionColdstartRate: [],
    average: null,
  },
  previousPeriod: {
    transactionColdstartRate: [],
    average: null,
  },
};

export function TransactionColdstartRateChart({
  height,
  showAnnotations = true,
  environment,
  kuery,
  transactionName,
  comparisonEnabled,
  comparisonType,
}: Props) {
  const theme = useTheme();

  const {
    query: { rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { serviceName, transactionType } = useApmServiceContext();
  const comparisonChartTheme = getComparisonChartTheme();
  const { offset } = getTimeRangeComparison({
    start,
    end,
    comparisonType,
    comparisonEnabled,
  });

  const endpoint = transactionName
    ? ('GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate_by_transaction_name' as const)
    : ('GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate' as const);

  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      if (transactionType && serviceName && start && end) {
        return callApmApi(endpoint, {
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
              offset,
              ...(transactionName ? { transactionName } : {}),
            },
          },
        });
      }
    },
    [
      environment,
      kuery,
      serviceName,
      start,
      end,
      transactionType,
      transactionName,
      offset,
      endpoint,
    ]
  );

  const timeseries = [
    {
      data: data.currentPeriod.transactionColdstartRate,
      type: 'linemark',
      color: theme.eui.euiColorVis5,
      title: i18n.translate('xpack.apm.coldstartRate.chart.coldstartRate', {
        defaultMessage: 'Cold start rate (avg.)',
      }),
    },
    ...(comparisonEnabled
      ? [
          {
            data: data.previousPeriod.transactionColdstartRate,
            type: 'area',
            color: theme.eui.euiColorMediumShade,
            title: i18n.translate(
              'xpack.apm.coldstartRate.chart.coldstartRate.previousPeriodLabel',
              { defaultMessage: 'Previous period' }
            ),
          },
        ]
      : []),
  ];

  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.apm.coldstartRate', {
                defaultMessage: 'Cold start rate',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiIconTip
            content={i18n.translate('xpack.apm.serviceOverview.coldstartHelp', {
              defaultMessage:
                'The cold start rate indicates the percentage of requests that trigger a cold start of a serverless function.',
            })}
            position="right"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <TimeseriesChart
        id="coldstartRate"
        height={height}
        showAnnotations={showAnnotations}
        fetchStatus={status}
        timeseries={timeseries}
        yLabelFormat={yLabelFormat}
        yDomain={{ min: 0, max: 1 }}
        customTheme={comparisonChartTheme}
      />
    </EuiPanel>
  );
}
