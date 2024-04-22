/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { euiLightVars as theme } from '@kbn/ui-theme';
import { termQuery } from '@kbn/observability-plugin/server';
import {
  FAAS_COLDSTART_DURATION,
  FAAS_ID,
  METRICSET_NAME,
} from '../../../../common/es_fields/apm';
import { fetchAndTransformMetrics } from '../fetch_and_transform_metrics';
import { ChartBase } from '../types';
import { isFiniteNumber } from '../../../../common/utils/is_finite_number';
import { APMConfig } from '../../..';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

const chartBase: ChartBase = {
  title: i18n.translate('xpack.apm.agentMetrics.serverless.coldStartDuration', {
    defaultMessage: 'Cold start duration',
  }),
  key: 'cold_start_duration',
  type: 'linemark',
  yUnit: 'time',
  series: {
    coldStart: {
      title: i18n.translate(
        'xpack.apm.agentMetrics.serverless.coldStartDuration',
        { defaultMessage: 'Cold start duration' }
      ),
      color: theme.euiColorVis5,
    },
  },
  description: i18n.translate(
    'xpack.apm.agentMetrics.serverless.coldStartDuration.description',
    {
      defaultMessage:
        'Cold start duration shows the execution duration of the serverless runtime for requests that experience cold starts.',
    }
  ),
};

export async function getColdStartDurationChart({
  environment,
  kuery,
  config,
  apmEventClient,
  serviceName,
  start,
  end,
  serverlessId,
}: {
  environment: string;
  kuery: string;
  config: APMConfig;
  apmEventClient: APMEventClient;
  serviceName: string;
  start: number;
  end: number;
  serverlessId?: string;
}) {
  const coldStartDurationMetric = await fetchAndTransformMetrics({
    environment,
    kuery,
    config,
    apmEventClient,
    serviceName,
    start,
    end,
    chartBase,
    aggs: { coldStart: { avg: { field: FAAS_COLDSTART_DURATION } } },
    additionalFilters: [
      { exists: { field: FAAS_COLDSTART_DURATION } },
      ...termQuery(FAAS_ID, serverlessId),
      ...termQuery(METRICSET_NAME, 'app'),
    ],
    operationName: 'get_cold_start_duration',
  });

  const [series] = coldStartDurationMetric.series;

  const data = series?.data?.map(({ x, y }) => ({
    x,
    // Cold start duration duration is stored in ms, convert it to microseconds so it uses the same unit as the other charts
    y: isFiniteNumber(y) ? y * 1000 : y,
  }));

  return {
    ...coldStartDurationMetric,
    series: series
      ? [
          {
            ...series,
            // Cold start duration duration is stored in ms, convert it to microseconds
            overallValue: series.overallValue * 1000,
            data,
          },
        ]
      : [],
  };
}
