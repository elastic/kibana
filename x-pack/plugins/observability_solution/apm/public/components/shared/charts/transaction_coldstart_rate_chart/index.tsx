/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiTitle, EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { usePreviousPeriodLabel } from '../../../../hooks/use_previous_period_text';
import { isTimeComparison } from '../../time_comparison/get_comparison_options';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { asPercent } from '../../../../../common/utils/formatters';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { useTheme } from '../../../../hooks/use_theme';
import { TimeseriesChartWithContext } from '../timeseries_chart_with_context';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { getComparisonChartTheme } from '../../time_comparison/get_comparison_chart_theme';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';

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
  offset?: string;
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
  offset,
}: Props) {
  const theme = useTheme();

  const {
    query: { rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { serviceName, transactionType, transactionTypeStatus } = useApmServiceContext();
  const comparisonChartTheme = getComparisonChartTheme();

  const endpoint = transactionName
    ? ('GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate_by_transaction_name' as const)
    : ('GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate' as const);

  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      if (!transactionType && transactionTypeStatus === FETCH_STATUS.SUCCESS) {
        return Promise.resolve(INITIAL_STATE);
      }

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
              offset: comparisonEnabled && isTimeComparison(offset) ? offset : undefined,
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
      transactionTypeStatus,
      transactionName,
      offset,
      endpoint,
      comparisonEnabled,
    ]
  );
  const previousPeriodLabel = usePreviousPeriodLabel();

  const timeseries = [
    {
      data: data?.currentPeriod?.transactionColdstartRate ?? [],
      type: 'linemark',
      color: theme.eui.euiColorVis5,
      title: i18n.translate('xpack.apm.coldstartRate.chart.coldstartRate', {
        defaultMessage: 'Cold start rate (avg.)',
      }),
    },
    ...(comparisonEnabled
      ? [
          {
            data: data?.previousPeriod?.transactionColdstartRate ?? [],
            type: 'area',
            color: theme.eui.euiColorMediumShade,
            title: previousPeriodLabel,
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
      <TimeseriesChartWithContext
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
