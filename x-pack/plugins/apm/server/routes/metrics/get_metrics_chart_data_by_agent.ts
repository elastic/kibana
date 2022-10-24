/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup } from '../../lib/helpers/setup_request';
import { getJavaMetricsCharts } from './by_agent/java';
import { getDefaultMetricsCharts } from './by_agent/default';
import { isJavaAgentName, isServerlessAgent } from '../../../common/agent_name';
import { GenericMetricsChart } from './fetch_and_transform_metrics';
import { getServerlessAgentMetricCharts } from './by_agent/serverless';

export async function getMetricsChartDataByAgent({
  environment,
  kuery,
  setup,
  serviceName,
  serviceNodeName,
  agentName,
  start,
  end,
  serviceRuntimeName,
}: {
  environment: string;
  kuery: string;
  setup: Setup;
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
    setup,
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
