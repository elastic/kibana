/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MetricDatum, MetricTrendShape } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { EuiIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback } from 'react';
import { useTheme } from '@kbn/observability-plugin/public';
import { useAnyOfApmParams } from '../../../../../hooks/use_apm_params';
import { useFetcher, isPending } from '../../../../../hooks/use_fetcher';
import { CLIENT_GEO_COUNTRY_NAME } from '../../../../../../common/es_fields/apm';
import { NOT_AVAILABLE_LABEL } from '../../../../../../common/i18n';
import { MetricItem } from './metric_item';
import { usePreviousPeriodLabel } from '../../../../../hooks/use_previous_period_text';

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

const valueFormatter = (value: number) => {
  return `${value}`;
};

const formatDifference = (value: number) => {
  return value > 0 ? '+' + value.toFixed(2) : value.toFixed(2);
};

const calculateDiffPercentageAndFormat = (
  currentValue?: number,
  previousValue?: number
) => {
  if (currentValue && previousValue) {
    const diffPercentageValue =
      ((currentValue - previousValue) / previousValue) * 100;

    return formatDifference(diffPercentageValue);
  }
  return '0';
};

export function MobileLocationStats({
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
    query: { environment, offset, comparisonEnabled, transactionType },
  } = useAnyOfApmParams('/mobile-services/{serviceName}/overview');

  const previousPeriodLabel = usePreviousPeriodLabel();

  const locationField = CLIENT_GEO_COUNTRY_NAME;

  const { data: locationStatsData, status: locationStatsStatus } = useFetcher(
    (callApmApi) => {
      return callApmApi(
        'GET /internal/apm/mobile-services/{serviceName}/location/stats',
        {
          params: {
            path: { serviceName },
            query: {
              start,
              end,
              environment,
              kuery,
              locationField,
              offset,
              transactionType,
            },
          },
        }
      );
    },
    [
      start,
      end,
      environment,
      kuery,
      serviceName,
      locationField,
      offset,
      transactionType,
    ]
  );

  const loadingLocationStats = isPending(locationStatsStatus);

  const currentPeriod = locationStatsData?.currentPeriod;
  const previousPeriod = locationStatsData?.previousPeriod;

  const getComparisonValueFormatter = useCallback(
    ({ currentPeriodValue, previousPeriodValue }) => {
      const comparisonDiffValue = calculateDiffPercentageAndFormat(
        currentPeriodValue,
        previousPeriodValue
      );
      return (
        <span>
          {comparisonEnabled
            ? `${currentPeriodValue} (${comparisonDiffValue}% ${previousPeriodLabel})`
            : `${currentPeriodValue}`}
        </span>
      );
    },
    [comparisonEnabled, previousPeriodLabel]
  );

  const metrics: MetricDatum[] = [
    {
      color: euiTheme.eui.euiColorLightestShade,
      title: i18n.translate(
        'xpack.apm.mobile.location.metrics.http.requests.title',
        {
          defaultMessage: 'Most used in',
        }
      ),
      extra: getComparisonValueFormatter({
        currentPeriodValue: currentPeriod?.mostRequests.value,
        previousPeriodValue: previousPeriod?.mostRequests.value,
      }),
      icon: getIcon('visBarHorizontal'),
      value: currentPeriod?.mostRequests.location ?? NOT_AVAILABLE_LABEL,
      valueFormatter: (value) => valueFormatter(value),
      trend: currentPeriod?.mostRequests.timeseries ?? [],
      trendShape: MetricTrendShape.Area,
    },
    {
      color: euiTheme.eui.euiColorDisabled,
      title: i18n.translate('xpack.apm.mobile.location.metrics.crashes', {
        defaultMessage: 'Most crashes',
      }),
      subtitle: i18n.translate('xpack.apm.mobile.coming.soon', {
        defaultMessage: 'Coming Soon',
      }),
      icon: getIcon('bug'),
      value: NOT_AVAILABLE_LABEL,
      valueFormatter: (value) => valueFormatter(value),
      trend: [],
      trendShape: MetricTrendShape.Area,
    },
    {
      color: euiTheme.eui.euiColorLightestShade,
      title: i18n.translate('xpack.apm.mobile.location.metrics.sessions', {
        defaultMessage: 'Most sessions',
      }),
      extra: getComparisonValueFormatter({
        currentPeriodValue: currentPeriod?.mostSessions.value,
        previousPeriodValue: previousPeriod?.mostSessions.value,
      }),
      icon: getIcon('timeslider'),
      value: currentPeriod?.mostSessions.location ?? NOT_AVAILABLE_LABEL,
      valueFormatter: (value) => valueFormatter(value),
      trend: currentPeriod?.mostSessions.timeseries ?? [],
      trendShape: MetricTrendShape.Area,
    },
    {
      color: euiTheme.eui.euiColorDisabled,
      title: i18n.translate('xpack.apm.mobile.location.metrics.launches', {
        defaultMessage: 'Most launches',
      }),
      subtitle: i18n.translate('xpack.apm.mobile.coming.soon', {
        defaultMessage: 'Coming Soon',
      }),
      icon: getIcon('launch'),
      value: NOT_AVAILABLE_LABEL,
      valueFormatter: (value) => valueFormatter(value),
      trend: [],
      trendShape: MetricTrendShape.Area,
    },
  ];

  return (
    <EuiFlexGroup direction="column">
      {metrics.map((metric, key) => (
        <EuiFlexItem key={key}>
          <MetricItem
            id={key}
            data={[metric]}
            isLoading={loadingLocationStats}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
