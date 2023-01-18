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
import { MetricItem } from './metric_item';
import { CLIENT_GEO_COUNTRY_NAME } from '../../../../../../common/es_fields/apm';
import { NOT_AVAILABLE_LABEL } from '../../../../../../common/i18n';

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
    query: { environment },
  } = useAnyOfApmParams('/mobile-services/{serviceName}/overview');

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
            },
          },
        }
      );
    },
    [start, end, environment, kuery, serviceName, locationField]
  );

  const loadingLocationStats = isPending(locationStatsStatus);

  const metrics: MetricDatum[] = [
    {
      color: euiTheme.eui.euiColorLightestShade,
      title: i18n.translate('xpack.apm.mobile.location.metrics.http.requests', {
        defaultMessage: 'Most used in',
      }),
      extra: i18n.translate(
        'xpack.apm.mobile.location.metrics.http.requests.value',
        {
          defaultMessage: '{requests} http requests',
          values: {
            requests: locationStatsData?.mostRequests.value,
          },
        }
      ),
      icon: getIcon('visBarHorizontal'),
      value: locationStatsData?.mostRequests.location ?? NOT_AVAILABLE_LABEL,
      trend: locationStatsData?.mostRequests.timeseries,
      trendShape: MetricTrendShape.Area,
    },
    {
      color: euiTheme.eui.euiColorLightestShade,
      title: i18n.translate('xpack.apm.mobile.location.metrics.crashes', {
        defaultMessage: 'Most crashes',
      }),
      extra: i18n.translate(
        'xpack.apm.mobile.location.metrics.http.crashes.value',
        {
          defaultMessage: '{crashes} crashes',
          values: {
            crashes: locationStatsData?.mostCrashes.value,
          },
        }
      ),
      icon: getIcon('bug'),
      value: locationStatsData?.mostCrashes.location ?? NOT_AVAILABLE_LABEL,
      trend: locationStatsData?.mostCrashes.timeseries,
      trendShape: MetricTrendShape.Area,
    },
    {
      color: euiTheme.eui.euiColorLightestShade,
      title: i18n.translate('xpack.apm.mobile.location.metrics.sessions', {
        defaultMessage: 'Most sessions',
      }),
      extra: i18n.translate(
        'xpack.apm.mobile.location.metrics.http.sessions.value',
        {
          defaultMessage: '{sessions} sessions',
          values: {
            sessions: locationStatsData?.mostSessions.value,
          },
        }
      ),
      icon: getIcon('timeslider'),
      value: locationStatsData?.mostSessions.location ?? NOT_AVAILABLE_LABEL,
      trend: locationStatsData?.mostSessions.timeseries,
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
            height="150px"
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
