/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MetricDatum, MetricTrendShape } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import {
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import { useTheme } from '@kbn/observability-plugin/public';
import { useAnyOfApmParams } from '../../../../../hooks/use_apm_params';
import { useFetcher, FETCH_STATUS } from '../../../../../hooks/use_fetcher';
import { MetricItem } from './metric_item';
import { usePreviousPeriodLabel } from '../../../../../hooks/use_previous_period_text';
import { isEmpty } from 'lodash';

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
            ? `${previousPeriodLabel}: ${value}`
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

  const metrics: MetricDatum[] = [
    {
      color: euiTheme.eui.euiColorDisabled,
      title: i18n.translate('xpack.apm.mobile.metrics.crash.rate', {
        defaultMessage: 'Crash Rate (Crash per minute)',
      }),
      subtitle: i18n.translate('xpack.apm.mobile.coming.soon', {
        defaultMessage: 'Coming Soon',
      }),
      icon: getIcon('bug'),
      value: 'N/A',
      valueFormatter: (value: number) => valueFormatter(value),
      trend: [],
      trendShape: MetricTrendShape.Area,
    },
    {
      color: euiTheme.eui.euiColorDisabled,
      title: i18n.translate('xpack.apm.mobile.metrics.load.time', {
        defaultMessage: 'Slowest App load time',
      }),
      subtitle: i18n.translate('xpack.apm.mobile.coming.soon', {
        defaultMessage: 'Coming Soon',
      }),
      icon: getIcon('visGauge'),
      value: 'N/A',
      valueFormatter: (value: number) => valueFormatter(value, 's'),
      trend: [],
      trendShape: MetricTrendShape.Area,
    },
    {
      color: euiTheme.eui.euiColorLightestShade,
      title: i18n.translate('xpack.apm.mobile.metrics.sessions', {
        defaultMessage: 'Sessions',
      }),
      icon: getIcon('timeslider'),
      value: data?.currentPeriod?.sessions?.value ?? NaN,
      valueFormatter: (value: number) => valueFormatter(value),
      trend: data?.currentPeriod?.sessions?.timeseries,
      extra: getComparisonValueFormatter(data?.previousPeriod.sessions?.value),
      trendShape: MetricTrendShape.Area,
    },
    {
      color: euiTheme.eui.euiColorLightestShade,
      title: i18n.translate('xpack.apm.mobile.metrics.http.requests', {
        defaultMessage: 'HTTP requests',
      }),
      icon: getIcon('kubernetesPod'),
      value: data?.currentPeriod.requests?.value ?? NaN,
      extra: getComparisonValueFormatter(data?.previousPeriod.requests?.value),
      valueFormatter: (value: number) => valueFormatter(value),
      trend: data?.currentPeriod.requests.timeseries,
      trendShape: MetricTrendShape.Area,
    },
  ];

  return (
    <EuiFlexGroup>
      {metrics.map((metric, key) => (
        <EuiFlexItem>
          <MetricItem
            id={key}
            data={[metric]}
            hasData={!isEmpty(data)}
            status={status}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
