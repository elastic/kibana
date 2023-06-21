/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiLightVars as theme } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import { METRIC_JAVA_GC_TIME } from '../../../../../../common/es_fields/apm';
import {
  fetchAndTransformGcMetrics,
  TIME,
} from './fetch_and_transform_gc_metrics';
import { ChartBase } from '../../../types';
import { APMEventClient } from '../../../../../lib/helpers/create_es_client/create_apm_event_client';
import { APMConfig } from '../../../../..';

const series = {
  [METRIC_JAVA_GC_TIME]: {
    title: i18n.translate('xpack.apm.agentMetrics.java.gcTime', {
      defaultMessage: 'GC time',
    }),
    color: theme.euiColorVis0,
  },
};

const chartBase: ChartBase = {
  title: i18n.translate('xpack.apm.agentMetrics.java.gcTimeChartTitle', {
    defaultMessage: 'Garbage collection time spent per minute',
  }),
  key: 'gc_time_line_chart',
  type: 'linemark',
  yUnit: 'time',
  series,
};

function getGcTimeChart({
  environment,
  kuery,
  config,
  apmEventClient,
  serviceName,
  serviceNodeName,
  start,
  end,
  isOpenTelemetry,
}: {
  environment: string;
  kuery: string;
  config: APMConfig;
  apmEventClient: APMEventClient;
  serviceName: string;
  serviceNodeName?: string;
  start: number;
  end: number;
  isOpenTelemetry?: boolean;
}) {
  return fetchAndTransformGcMetrics({
    environment,
    kuery,
    config,
    apmEventClient,
    serviceName,
    serviceNodeName,
    start,
    end,
    chartBase,
    rateOrTime: TIME,
    operationName: 'get_gc_time_charts',
    isOpenTelemetry,
  });
}

export { getGcTimeChart };
