/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  apmAWSLambdaPriceFactor,
  AwsLambdaPriceFactor,
} from '@kbn/observability-plugin/common';
import { setupRequest } from '../../lib/helpers/setup_request';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { environmentRt, kueryRt, rangeRt } from '../default_api_types';
import { getServerlessAgentMetricsCharts } from './by_agent/serverless/get_serverless_agent_metrics_chart';
import { getServerlessActiveInstancesOverview } from './by_agent/serverless/get_active_instances_overview';
import { getServerlessFunctionsOverview } from './by_agent/serverless/get_serverless_functions_overview';
import { getServerlessSummary } from './by_agent/serverless/get_serverless_summary';
import { FetchAndTransformMetrics } from './fetch_and_transform_metrics';
import { getMetricsChartDataByAgent } from './get_metrics_chart_data_by_agent';

const metricsChartsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/metrics/charts',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.type({
        agentName: t.string,
      }),
      t.partial({
        serviceNodeName: t.string,
        serviceRuntimeName: t.string,
      }),
      environmentRt,
      kueryRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    charts: FetchAndTransformMetrics[];
  }> => {
    const { params } = resources;
    const setup = await setupRequest(resources);
    const { serviceName } = params.path;
    const {
      agentName,
      environment,
      kuery,
      serviceNodeName,
      start,
      end,
      serviceRuntimeName,
    } = params.query;

    const charts = await getMetricsChartDataByAgent({
      environment,
      kuery,
      setup,
      serviceName,
      agentName,
      serviceNodeName,
      start,
      end,
      serviceRuntimeName,
    });

    return { charts };
  },
});

const serverlessMetricsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/metrics/serverless',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([environmentRt, kueryRt, rangeRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    metricCharts: Awaited<ReturnType<typeof getServerlessAgentMetricsCharts>>;
    serverlessSummary: Awaited<ReturnType<typeof getServerlessSummary>>;
    serverlessFunctionsOverview: Awaited<
      ReturnType<typeof getServerlessFunctionsOverview>
    >;
    serverlessActiveInstancesOverview: Awaited<
      ReturnType<typeof getServerlessActiveInstancesOverview>
    >;
  }> => {
    const { params } = resources;
    const setup = await setupRequest(resources);

    const {
      uiSettings: { client: uiSettingsClient },
    } = await resources.context.core;

    const awsLambdaPriceFactor =
      await uiSettingsClient.get<AwsLambdaPriceFactor>(apmAWSLambdaPriceFactor);

    const { serviceName } = params.path;
    const { environment, kuery, start, end } = params.query;
    const options = {
      environment,
      start,
      end,
      kuery,
      setup,
      serviceName,
    };

    const [
      metricCharts,
      serverlessSummary,
      serverlessFunctionsOverview,
      serverlessActiveInstancesOverview,
    ] = await Promise.all([
      getServerlessAgentMetricsCharts(options),
      getServerlessSummary({ ...options, awsLambdaPriceFactor }),
      getServerlessFunctionsOverview(options),
      getServerlessActiveInstancesOverview(options),
    ]);

    return {
      metricCharts,
      serverlessSummary,
      serverlessFunctionsOverview,
      serverlessActiveInstancesOverview,
    };
  },
});

export const metricsRouteRepository = {
  ...metricsChartsRoute,
  ...serverlessMetricsRoute,
};
