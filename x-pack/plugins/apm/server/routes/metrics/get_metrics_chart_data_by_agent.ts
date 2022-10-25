/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getJavaMetricsCharts } from './by_agent/java';
import { getDefaultMetricsCharts } from './by_agent/default';
import { isJavaAgentName, isServerlessAgent } from '../../../common/agent_name';
import { GenericMetricsChart } from './fetch_and_transform_metrics';
import { getServerlessAgentMetricCharts } from './by_agent/serverless';
import { APMConfig } from '../..';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

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
  serviceRuntimeName,
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
  serviceRuntimeName?: string;
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
  const serverlessAgent = isServerlessAgent(serviceRuntimeName);

  if (isJavaAgentName(agentName) && !serverlessAgent) {
    return getJavaMetricsCharts({
      ...options,
      serviceNodeName,
    });
  }

  if (serverlessAgent) {
    return getServerlessAgentMetricCharts(options);
  }

  return getDefaultMetricsCharts(options);
}
