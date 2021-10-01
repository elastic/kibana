/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup } from '../helpers/setup_request';
import { getJavaMetricsCharts } from './by_agent/java';
import { getDefaultMetricsCharts } from './by_agent/default';
import { GenericMetricsChart } from './transform_metrics_chart';
import { isJavaAgentName } from '../../../common/agent_name';
import { getServiceAgentIds } from '../services/get_service_agent_ids';
import { getSearchAggregatedTransactions } from '../helpers/aggregated_transactions';

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
  start,
  end,
}: {
  environment: string;
  kuery: string;
  setup: Setup;
  serviceName: string;
  serviceNodeName?: string;
  agentName: string;
  start: number;
  end: number;
}): Promise<MetricsChartsByAgentAPIResponse> {
  const searchAggregatedTransactions = await getSearchAggregatedTransactions({
    ...setup,
    kuery: '',
  });

  const serviceAgentIds = await getServiceAgentIds({
    serviceName,
    setup,
    searchAggregatedTransactions,
    start,
    end,
  });

  if (isJavaAgentName(agentName)) {
    return getJavaMetricsCharts({
      environment,
      kuery,
      setup,
      serviceAgentIds,
      serviceNodeName,
      start,
      end,
    });
  }

  return getDefaultMetricsCharts({
    environment,
    kuery,
    setup,
    serviceAgentIds,
    start,
    end,
  });
}
