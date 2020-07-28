/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../helpers/setup_request';
import { getJavaMetricsCharts } from './by_agent/java';
import { getDefaultMetricsCharts } from './by_agent/default';
import { GenericMetricsChart } from './transform_metrics_chart';

export interface MetricsChartsByAgentAPIResponse {
  charts: GenericMetricsChart[];
}

export async function getMetricsChartDataByAgent({
  setup,
  serviceName,
  serviceNodeName,
  agentName,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  serviceName: string;
  serviceNodeName?: string;
  agentName: string;
}): Promise<MetricsChartsByAgentAPIResponse> {
  switch (agentName) {
    case 'java': {
      return getJavaMetricsCharts(setup, serviceName, serviceNodeName);
    }

    default: {
      return getDefaultMetricsCharts(setup, serviceName);
    }
  }
}
