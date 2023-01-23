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

const getComparisonStatsMsg = (
  comparisonEnabled: boolean,
  keyword: string,
  previousPeriodLabel: string
) => {
  if (comparisonEnabled) {
    return `{currentStatValue} ${keyword} ({comparisonDiffValue}% ${previousPeriodLabel})`;
  }
  return `{currentStatValue} ${keyword}`;
};

const formatDifference = (value: number) => {
  return value > 0 ? '+' + value.toFixed(2) : '-' + value.toFixed(2);
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
    query: { environment, offset, comparisonEnabled },
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
            },
          },
        }
      );
    },
    [start, end, environment, kuery, serviceName, locationField, offset]
  );

  const loadingLocationStats = isPending(locationStatsStatus);

  const currentPeriod = locationStatsData?.currentPeriod;
  const previousPeriod = locationStatsData?.previousPeriod;

  const metrics: MetricDatum[] = [
    {
      color: euiTheme.eui.euiColorLightestShade,
      title: i18n.translate('xpack.apm.mobile.location.metrics.http.requests', {
        defaultMessage: 'Most used in',
      }),
      extra: i18n.translate(
        'xpack.apm.mobile.location.metrics.http.requests.value',
        {
          defaultMessage: getComparisonStatsMsg(
            comparisonEnabled,
            'http requests',
            previousPeriodLabel
          ),
          values: {
            currentStatValue: currentPeriod?.mostRequests.value,
            comparisonDiffValue: calculateDiffPercentageAndFormat(
              currentPeriod?.mostRequests.value,
              previousPeriod?.mostRequests.value
            ),
          },
        }
      ),
      icon: getIcon('visBarHorizontal'),
      value: currentPeriod?.mostRequests.location ?? NOT_AVAILABLE_LABEL,
      trend: currentPeriod?.mostRequests.timeseries,
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
      extra: i18n.translate('xpack.apm.mobile.location.metrics.crashes.value', {
        defaultMessage: getComparisonStatsMsg(
          comparisonEnabled,
          'crashes/min',
          previousPeriodLabel
        ),
        values: {
          currentStatValue: currentPeriod?.mostCrashes.value,
          comparisonDiffValue: calculateDiffPercentageAndFormat(
            currentPeriod?.mostCrashes.value,
            previousPeriod?.mostCrashes.value
          ),
        },
      }),
      icon: getIcon('bug'),
      value: currentPeriod?.mostCrashes.location ?? NOT_AVAILABLE_LABEL,
      trend: currentPeriod?.mostCrashes.timeseries,
      trendShape: MetricTrendShape.Area,
    },
    {
      color: euiTheme.eui.euiColorLightestShade,
      title: i18n.translate('xpack.apm.mobile.location.metrics.sessions', {
        defaultMessage: 'Most sessions',
      }),
      extra: i18n.translate(
        'xpack.apm.mobile.location.metrics.sessions.value',
        {
          defaultMessage: getComparisonStatsMsg(
            comparisonEnabled,
            'sessions',
            previousPeriodLabel
          ),
          values: {
            currentStatValue: currentPeriod?.mostSessions.value,
            comparisonDiffValue: calculateDiffPercentageAndFormat(
              currentPeriod?.mostSessions.value,
              previousPeriod?.mostSessions.value
            ),
          },
        }
      ),
      icon: getIcon('timeslider'),
      value: currentPeriod?.mostSessions.location ?? NOT_AVAILABLE_LABEL,
      trend: currentPeriod?.mostSessions.timeseries,
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
      extra: i18n.translate(
        'xpack.apm.mobile.location.metrics.launches.value',
        {
          defaultMessage: getComparisonStatsMsg(
            comparisonEnabled,
            'launches',
            previousPeriodLabel
          ), // return simple msg
          values: {
            currentStatValue: 0,
            comparisonDiffValue: calculateDiffPercentageAndFormat(0, 0),
          },
        }
      ),
      icon: getIcon('launch'),
      value: NOT_AVAILABLE_LABEL,
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
