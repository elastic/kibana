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
import { asExactTransactionRate } from '../../../../common/utils/formatters';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useTheme } from '../../../hooks/use_theme';
import { useTimeRange } from '../../../hooks/use_time_range';
import { TimeseriesChart } from '../../shared/charts/timeseries_chart';
import {
  getComparisonChartTheme,
  getTimeRangeComparison,
} from '../../shared/time_comparison/get_time_range_comparison';

const INITIAL_STATE = {
  currentPeriod: [],
  previousPeriod: [],
  throughputUnit: 'minute' as const,
};

export function ServiceOverviewThroughputChart({
  height,
  environment,
  kuery,
  transactionName,
}: {
  height?: number;
  environment: string;
  kuery: string;
  transactionName?: string;
}) {
  const theme = useTheme();

  const {
    urlParams: { comparisonEnabled, comparisonType },
  } = useUrlParams();

  const {
    query: { rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { transactionType, serviceName } = useApmServiceContext();
  const comparisonChartTheme = getComparisonChartTheme(theme);
  const { comparisonStart, comparisonEnd } = getTimeRangeComparison({
    start,
    end,
    comparisonType,
    comparisonEnabled,
  });

  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      if (serviceName && transactionType && start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/services/{serviceName}/throughput',
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
              comparisonStart,
              comparisonEnd,
              transactionName,
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
      comparisonStart,
      comparisonEnd,
      transactionName,
    ]
  );

  const timeseries = [
    {
      data: data.currentPeriod,
      type: 'linemark',
      color: theme.eui.euiColorVis0,
      title: i18n.translate('xpack.apm.serviceOverview.throughtputChartTitle', {
        defaultMessage: 'Throughput',
      }),
    },
    ...(comparisonEnabled
      ? [
          {
            data: data.previousPeriod,
            type: 'area',
            color: theme.eui.euiColorMediumShade,
            title: i18n.translate(
              'xpack.apm.serviceOverview.throughtputChart.previousPeriodLabel',
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
              {i18n.translate(
                'xpack.apm.serviceOverview.throughtputChartTitle',
                { defaultMessage: 'Throughput' }
              )}
              {data.throughputUnit === 'second'
                ? i18n.translate(
                    'xpack.apm.serviceOverview.throughtputPerSecondChartTitle',
                    { defaultMessage: ' (per second)' }
                  )
                : ''}
            </h2>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiIconTip
            content={
              data.throughputUnit === 'minute'
                ? i18n.translate('xpack.apm.serviceOverview.tpmHelp', {
                    defaultMessage:
                      'Throughput is measured in transactions per minute (tpm)',
                  })
                : i18n.translate('xpack.apm.serviceOverview.tpsHelp', {
                    defaultMessage:
                      'Throughput is measured in transactions per second (tps)',
                  })
            }
            position="right"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <TimeseriesChart
        id="throughput"
        height={height}
        showAnnotations={false}
        fetchStatus={status}
        timeseries={timeseries}
        yLabelFormat={(y) => asExactTransactionRate(y, data.throughputUnit)}
        customTheme={comparisonChartTheme}
      />
    </EuiPanel>
  );
}
