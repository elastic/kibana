/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup } from '../../lib/helpers/setup_request';
import { getJavaMetricsCharts } from './by_agent/java';
import { getDefaultMetricsCharts } from './by_agent/default';
import { isJavaAgentName } from '../../../common/agent_name';
import { GenericMetricsChart } from './fetch_and_transform_metrics';

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
}): Promise<GenericMetricsChart[]> {
  if (isJavaAgentName(agentName)) {
    return getJavaMetricsCharts({
      environment,
      kuery,
      setup,
      serviceName,
      serviceNodeName,
      start,
      end,
    });
  }

  return getDefaultMetricsCharts({
    environment,
    kuery,
    setup,
    serviceName,
    start,
    end,
  });
}
