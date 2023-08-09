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
import moment from 'moment';
import { getComparisonChartTheme } from '../../../../shared/time_comparison/get_comparison_chart_theme';
import { TimeseriesChartWithContext } from '../../../../shared/charts/timeseries_chart_with_context';

import { useFetcher } from '../../../../../hooks/use_fetcher';

import { useApmPluginContext } from '../../../../../context/apm_plugin/use_apm_plugin_context';
import {
  ChartType,
  getTimeSeriesColor,
} from '../../../../shared/charts/helper/get_timeseries_color';
import { usePreviousPeriodLabel } from '../../../../../hooks/use_previous_period_text';

const INITIAL_STATE = {
  currentPeriod: { timeseries: [] },
  previousPeriod: { timeseries: [] },
};

export function HttpResponseRateChart({
  kuery,
  serviceName,
  start,
  end,
  environment,
  offset,
  comparisonEnabled,
}: {
  kuery: string;
  serviceName: string;
  start: string;
  end: string;
  environment: string;
  offset?: string;
  comparisonEnabled: boolean;
}) {
  const comparisonChartTheme = getComparisonChartTheme();
  const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
    ChartType.HTTP_REQUESTS
  );
  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      return callApmApi(
        'GET /internal/apm/mobile-services/{serviceName}/http/error/rate',
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
              offset: comparisonEnabled ? offset : undefined,
            },
          },
        }
      );
    },
    [environment, kuery, serviceName, start, end, offset, comparisonEnabled]
  );

  // const theme = useTheme();
  const min = moment.utc(start).valueOf();
  const max = moment.utc(end).valueOf();
  const { core } = useApmPluginContext();
  const previousPeriodLabel = usePreviousPeriodLabel();

  const timeseries = [
    {
      data: data.currentPeriod.timeseries,
      type: 'linemark',
      color: currentPeriodColor,
      title: i18n.translate('xpack.apm.transactions.httpRequestsTitle', {
        defaultMessage: 'HTTP Requests',
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
    <EuiPanel hasBorder={true}>
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
            content={i18n.translate(
              'xpack.apm.mobile.errors.httpErrorRateTooltip',
              {
                defaultMessage: 'Http response status codes by type.',
              }
            )}
            position="right"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <TimeseriesChartWithContext
        id="httpErrors"
        showAnnotations={false}
        fetchStatus={status}
        timeseries={timeseries}
        customTheme={comparisonChartTheme}
        yLabelFormat={(y) => `${y}`}
      />
    </EuiPanel>
  );
}
