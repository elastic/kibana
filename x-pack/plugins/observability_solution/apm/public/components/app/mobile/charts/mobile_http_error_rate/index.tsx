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
  EuiProgress,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { getComparisonChartTheme } from '../../../../shared/time_comparison/get_comparison_chart_theme';
import { TimeseriesChartWithContext } from '../../../../shared/charts/timeseries_chart_with_context';
import { isPending, useFetcher } from '../../../../../hooks/use_fetcher';

import {
  ChartType,
  getTimeSeriesColor,
} from '../../../../shared/charts/helper/get_timeseries_color';
import { usePreviousPeriodLabel } from '../../../../../hooks/use_previous_period_text';

const INITIAL_STATE = {
  currentPeriod: { timeseries: [] },
  previousPeriod: { timeseries: [] },
};

export function HttpErrorRateChart({
  height,
  kuery,
  serviceName,
  start,
  end,
  environment,
  offset,
  comparisonEnabled,
}: {
  height: number;
  kuery: string;
  serviceName: string;
  start: string;
  end: string;
  environment: string;
  offset?: string;
  comparisonEnabled: boolean;
}) {
  const comparisonChartTheme = getComparisonChartTheme();
  const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(ChartType.HTTP_REQUESTS);
  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/mobile-services/{serviceName}/error/http_error_rate', {
        params: {
          path: {
            serviceName,
          },
          query: {
            environment,
            kuery,
            start,
            end,
            offset: comparisonEnabled ? offset : undefined,
          },
        },
      });
    },
    [environment, kuery, serviceName, start, end, offset, comparisonEnabled]
  );

  const previousPeriodLabel = usePreviousPeriodLabel();

  const timeseries = [
    {
      data: data.currentPeriod.timeseries,
      type: 'linemark',
      color: currentPeriodColor,
      title: i18n.translate('xpack.apm.errors.httpErrorRateTitle', {
        defaultMessage: 'HTTP error rate',
      }),
    },
    ...(comparisonEnabled
      ? [
          {
            data: data.previousPeriod.timeseries,
            type: 'area',
            color: previousPeriodColor,
            title: previousPeriodLabel,
          },
        ]
      : []),
  ];

  return (
    <EuiPanel hasBorder={true} style={{ position: 'relative' }}>
      {isPending(status) && <EuiProgress size="xs" color="accent" position="absolute" />}
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.apm.mobile.errors.httpErrorRate', {
                defaultMessage: 'HTTP Error Rate',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            content={i18n.translate('xpack.apm.mobile.errors.httpErrorRateTooltip', {
              defaultMessage: 'Http error rate consisting of 4xx & 5xx.',
            })}
            position="right"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <TimeseriesChartWithContext
        id="httpErrors"
        height={height}
        showAnnotations={false}
        fetchStatus={status}
        timeseries={timeseries}
        customTheme={comparisonChartTheme}
        yLabelFormat={(y) => `${y}`}
      />
    </EuiPanel>
  );
}
