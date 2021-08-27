/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { getJavaMetricsCharts } from './by_agent/java';
import { getDefaultMetricsCharts } from './by_agent/default';
import { GenericMetricsChart } from './transform_metrics_chart';
import { isJavaAgentName } from '../../../common/agent_name';

export interface MetricsChartsByAgentAPIResponse {
  charts: GenericMetricsChart[];
}

export async function getMetricsChartDataByAgent({
  environment,
  kuery,
  setup,
  serviceName,
  serviceNodeName,
  agentName,
}: {
  environment: string;
  kuery: string;
  setup: Setup & SetupTimeRange;
  serviceName: string;
  serviceNodeName?: string;
  agentName: string;
}): Promise<MetricsChartsByAgentAPIResponse> {
  if (isJavaAgentName(agentName)) {
    return getJavaMetricsCharts({
      environment,
      kuery,
      setup,
      serviceName,
      serviceNodeName,
    });
  }

  return getDefaultMetricsCharts({
    environment,
    kuery,
    setup,
    serviceName,
  });
}
