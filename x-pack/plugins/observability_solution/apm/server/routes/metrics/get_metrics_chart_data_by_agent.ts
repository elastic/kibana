/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getJavaMetricsCharts } from './by_agent/java';
import { getDefaultMetricsCharts } from './by_agent/default';
import { isJavaAgentName } from '../../../common/agent_name';
import { GenericMetricsChart } from './fetch_and_transform_metrics';
import { APMConfig } from '../..';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { hasOTelMetrics } from './has_otel_metrics';

export async function getMetricsChartDataByAgent({
  environment,
  kuery,
  config,
  apmEventClient,
  serviceName,
  serviceNodeName,
  agentName,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  config: APMConfig;
  apmEventClient: APMEventClient;
  serviceName: string;
  serviceNodeName?: string;
  agentName: string;
  start: number;
  end: number;
}): Promise<GenericMetricsChart[]> {
  const options = {
    environment,
    kuery,
    config,
    apmEventClient,
    serviceName,
    start,
    end,
  };
  const isOpenTelemetry = await hasOTelMetrics(options);

  if (isJavaAgentName(agentName)) {
    return getJavaMetricsCharts({
      ...options,
      serviceNodeName,
      isOpenTelemetry,
    });
  }

  return getDefaultMetricsCharts({ ...options, isOpenTelemetry });
}
