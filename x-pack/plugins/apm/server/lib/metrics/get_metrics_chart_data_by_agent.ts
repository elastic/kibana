/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Setup } from '../helpers/setup_request';
import { getJavaMetricsChartData } from './by_agent/java';

export async function getMetricsChartDataByAgent({
  setup,
  serviceName,
  agentName
}: {
  setup: Setup;
  serviceName: string;
  agentName: string;
}) {
  switch (agentName) {
    case 'java': {
      return getJavaMetricsChartData(setup, serviceName);
    }

    default: {
      throw new Error(`Unknown agent name: '${agentName}'`);
    }
  }
}
