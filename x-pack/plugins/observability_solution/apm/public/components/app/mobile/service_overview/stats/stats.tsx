/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MetricDatum, MetricTrendShape } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import { useTheme } from '@kbn/observability-shared-plugin/public';
import { NOT_AVAILABLE_LABEL } from '../../../../../../common/i18n';
import { useAnyOfApmParams } from '../../../../../hooks/use_apm_params';
import {
  FETCH_STATUS,
  isPending,
  useFetcher,
} from '../../../../../hooks/use_fetcher';
import { MetricItem } from './metric_item';
import { usePreviousPeriodLabel } from '../../../../../hooks/use_previous_period_text';

const valueFormatter = (value: number, suffix = '') => {
  return `${value} ${suffix}`;
};

export function MobileStats({
  start,
  end,
  kuery,
}: {
  start: string;
  end: string;
  kuery: string;
}) {
  const euiTheme = useTheme();

  const {
    path: { serviceName },
    query: { environment, transactionType, offset, comparisonEnabled },
  } = useAnyOfApmParams('/mobile-services/{serviceName}/overview');

  const previousPeriodLabel = usePreviousPeriodLabel();

  const { data, status } = useFetcher(
    (callApmApi) => {
      return callApmApi(
        'GET /internal/apm/mobile-services/{serviceName}/stats',
        {
          params: {
            path: { serviceName },
            query: {
              start,
              end,
              environment,
              kuery,
              transactionType,
              offset,
            },
          },
        }
      );
    },
    [start, end, environment, kuery, serviceName, transactionType, offset]
  );

  const getComparisonValueFormatter = useCallback(
    (value) => {
      return (
        <span>
          {value && comparisonEnabled
            ? `${previousPeriodLabel}: ${
                Number.isInteger(value) ? value : value.toFixed(2)
              }`
            : null}
        </span>
      );
    },
    [comparisonEnabled, previousPeriodLabel]
  );

  const getIcon = useCallback(
    (type: string) =>
      ({
        width = 20,
        height = 20,
        color,
      }: {
        width: number;
        height: number;
        color: string;
      }) => {
        return status === FETCH_STATUS.LOADING ? (
          <EuiLoadingSpinner size="m" />
        ) : (
          <EuiIcon type={type} width={width} height={height} fill={color} />
        );
      },
    [status]
  );

  const loadingStats = isPending(status);

  const metrics: MetricDatum[] = [
    {
      color: euiTheme.eui.euiColorLightestShade,
      title: i18n.translate('xpack.apm.mobile.metrics.crash.rate', {
        defaultMessage: 'Crash rate',
      }),
      icon: getIcon('bug'),
      value: data?.currentPeriod?.crashRate?.value ?? NaN,
      valueFormatter: (value: number) =>
        Number.isNaN(value)
          ? NOT_AVAILABLE_LABEL
          : valueFormatter(Number((value * 100).toPrecision(2)), '%'),
      trend: data?.currentPeriod?.crashRate?.timeseries ?? [],
      extra: getComparisonValueFormatter(data?.previousPeriod.crashRate?.value),
      trendShape: MetricTrendShape.Area,
    },
    {
      color: euiTheme.eui.euiColorLightestShade,
      title: i18n.translate('xpack.apm.mobile.metrics.load.time', {
        defaultMessage: 'Average app load time',
      }),
      icon: getIcon('visGauge'),
      value: data?.currentPeriod?.launchTimes?.value ?? NaN,
      valueFormatter: (value: number) =>
        Number.isNaN(value)
          ? NOT_AVAILABLE_LABEL
          : valueFormatter(Number(value.toFixed(1)), 'ms'),
      trend: data?.currentPeriod?.launchTimes?.timeseries ?? [],
      extra: getComparisonValueFormatter(
        data?.previousPeriod.launchTimes?.value
      ),
      trendShape: MetricTrendShape.Area,
    },
    {
      color: euiTheme.eui.euiColorLightestShade,
      title: i18n.translate('xpack.apm.mobile.metrics.sessions', {
        defaultMessage: 'Sessions',
      }),
      icon: getIcon('timeslider'),
      value: data?.currentPeriod?.sessions?.value ?? NaN,
      valueFormatter: (value: number) =>
        Number.isNaN(value) ? NOT_AVAILABLE_LABEL : valueFormatter(value),
      trend: data?.currentPeriod?.sessions?.timeseries ?? [],
      extra: getComparisonValueFormatter(data?.previousPeriod.sessions?.value),
      trendShape: MetricTrendShape.Area,
    },
    {
      color: euiTheme.eui.euiColorLightestShade,
      title: i18n.translate('xpack.apm.mobile.metrics.http.requests', {
        defaultMessage: 'HTTP requests',
      }),
      icon: getIcon('kubernetesPod'),
      extra: getComparisonValueFormatter(data?.previousPeriod.requests?.value),
      value: data?.currentPeriod?.requests?.value ?? NaN,
      valueFormatter: (value: number) =>
        Number.isNaN(value) ? NOT_AVAILABLE_LABEL : valueFormatter(value),
      trend: data?.currentPeriod?.requests?.timeseries ?? [],
      trendShape: MetricTrendShape.Area,
    },
  ];

  return (
    <EuiFlexGroup gutterSize="s">
      {metrics.map((metric, key) => (
        <EuiFlexItem key={key}>
          <MetricItem id={key} data={[metric]} isLoading={loadingStats} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
