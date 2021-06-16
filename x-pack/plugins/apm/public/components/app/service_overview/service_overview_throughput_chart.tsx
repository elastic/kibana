/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useParams } from 'react-router-dom';
import { asTransactionRate } from '../../../../common/utils/formatters';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useTheme } from '../../../hooks/use_theme';
import { TimeseriesChart } from '../../shared/charts/timeseries_chart';
import {
  getComparisonChartTheme,
  getTimeRangeComparison,
} from '../../shared/time_comparison/get_time_range_comparison';

const INITIAL_STATE = {
  currentPeriod: [],
  previousPeriod: [],
};

export function ServiceOverviewThroughputChart({
  height,
}: {
  height?: number;
}) {
  const theme = useTheme();
  const { serviceName } = useParams<{ serviceName?: string }>();
  const {
    urlParams: {
      environment,
      kuery,
      start,
      end,
      comparisonEnabled,
      comparisonType,
    },
  } = useUrlParams();
  const { transactionType } = useApmServiceContext();
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
      <EuiTitle size="xs">
        <h2>
          {i18n.translate('xpack.apm.serviceOverview.throughtputChartTitle', {
            defaultMessage: 'Throughput',
          })}
        </h2>
      </EuiTitle>
      <TimeseriesChart
        id="throughput"
        height={height}
        showAnnotations={false}
        fetchStatus={status}
        timeseries={timeseries}
        yLabelFormat={asTransactionRate}
        customTheme={comparisonChartTheme}
      />
    </EuiPanel>
  );
}
