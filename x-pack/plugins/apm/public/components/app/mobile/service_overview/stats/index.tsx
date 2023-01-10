/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MetricDatum, MetricTrendShape } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { EuiIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { useTheme } from '@kbn/observability-plugin/public';
import { useAnyOfApmParams } from '../../../../../hooks/use_apm_params';
import { useFetcher, FETCH_STATUS } from '../../../../../hooks/use_fetcher';
import { MetricItem } from './metric_item';

const valueFormatter = (value: number, suffix = '') => {
  return `${value} ${suffix}`;
};

const getIcon =
  (type: string) =>
  ({
    width = 20,
    height = 20,
    color,
  }: {
    width: number;
    height: number;
    color: string;
  }) =>
    <EuiIcon type={type} width={width} height={height} fill={color} />;

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
    query: { environment, transactionType },
  } = useAnyOfApmParams('/mobile-services/{serviceName}/overview');

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
            },
          },
        }
      );
    },
    [start, end, environment, kuery, serviceName, transactionType]
  );

  const metrics: MetricDatum[] = [
    {
      color: euiTheme.eui.euiColorLightestShade,
      title: i18n.translate('xpack.apm.mobile.metrics.crash.rate', {
        defaultMessage: 'Crash Rate',
      }),
      icon: getIcon('bug'),
      value: data?.crashCount?.value ?? NaN,
      valueFormatter: (value: number) => valueFormatter(value, 'cpm'),
      trend: data?.maxLoadTime?.timeseries,
      trendShape: MetricTrendShape.Area,
    },
    {
      color: euiTheme.eui.euiColorLightestShade,
      title: i18n.translate('xpack.apm.mobile.metrics.load.time', {
        defaultMessage: 'Slowest App load time',
      }),
      icon: getIcon('visGauge'),
      value: data?.maxLoadTime?.value ?? NaN,
      valueFormatter: (value: number) => valueFormatter(value, 's'),
      trend: data?.maxLoadTime.timeseries,
      trendShape: MetricTrendShape.Area,
    },
    {
      color: euiTheme.eui.euiColorLightestShade,
      title: i18n.translate('xpack.apm.mobile.metrics.sessions', {
        defaultMessage: 'Sessions',
      }),
      icon: getIcon('timeslider'),
      value: data?.sessions?.value ?? NaN,
      valueFormatter: (value: number) => valueFormatter(value),
      trend: data?.sessions.timeseries,
      trendShape: MetricTrendShape.Area,
    },
    {
      color: euiTheme.eui.euiColorLightestShade,
      title: i18n.translate('xpack.apm.mobile.metrics.http.requests', {
        defaultMessage: 'HTTP requests',
      }),
      icon: getIcon('kubernetesPod'),
      value: data?.requests?.value ?? NaN,
      valueFormatter: (value: number) => valueFormatter(value),
      trend: data?.requests.timeseries,
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
            isLoading={status === FETCH_STATUS.LOADING}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
