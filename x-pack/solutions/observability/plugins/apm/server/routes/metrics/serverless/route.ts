/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  apmAWSLambdaPriceFactor,
  apmAWSLambdaRequestCostPerMillion,
} from '@kbn/observability-plugin/common';
import {
  routeDefinitions,
  type ServerlessMetricsChartsResponse,
  type ServerlessActiveInstancesResponse,
  type ServerlessFunctionsOverviewRouteResponse,
  type ServerlessSummaryResponse,
  type AWSLambdaPriceFactor,
} from '@kbn/apm-api-shared';
import { createApmServerRoute } from '../../apm_routes/create_apm_server_route';
import { getServerlessAgentMetricsCharts } from './get_serverless_agent_metrics_chart';
import { getServerlessActiveInstancesOverview } from './get_active_instances_overview';
import { getServerlessFunctionsOverview } from './get_serverless_functions_overview';
import { getServerlessSummary } from './get_serverless_summary';
import { getActiveInstancesTimeseries } from './get_active_instances_timeseries';
import { getApmEventClient } from '../../../lib/helpers/get_apm_event_client';

const serverlessMetricsChartsRoute = createApmServerRoute({
  endpoint: routeDefinitions.metrics.serverlessCharts.endpoint,
  params: routeDefinitions.metrics.serverlessCharts.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServerlessMetricsChartsResponse> => {
    const { params, config } = resources;
    const apmEventClient = await getApmEventClient(resources);

    const { serviceName } = params.path;
    const {
      environment,
      kuery,
      start,
      end,
      serverlessId,
      documentType,
      rollupInterval,
      bucketSizeInSeconds,
    } = params.query;

    const charts = await getServerlessAgentMetricsCharts({
      environment,
      start,
      end,
      kuery,
      config,
      apmEventClient,
      serviceName,
      serverlessId,
      documentType,
      rollupInterval,
      bucketSizeInSeconds,
    });

    return { charts };
  },
});

const serverlessMetricsActiveInstancesRoute = createApmServerRoute({
  endpoint: routeDefinitions.metrics.serverlessActiveInstances.endpoint,
  params: routeDefinitions.metrics.serverlessActiveInstances.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServerlessActiveInstancesResponse> => {
    const { params, config } = resources;
    const apmEventClient = await getApmEventClient(resources);

    const { serviceName } = params.path;
    const { environment, kuery, start, end, serverlessId } = params.query;

    const options = {
      environment,
      start,
      end,
      kuery,
      serviceName,
      serverlessId,
      apmEventClient,
    };

    const [activeInstances, timeseries] = await Promise.all([
      getServerlessActiveInstancesOverview(options),
      getActiveInstancesTimeseries({ ...options, config }),
    ]);
    return { activeInstances, timeseries };
  },
});

const serverlessMetricsFunctionsOverviewRoute = createApmServerRoute({
  endpoint: routeDefinitions.metrics.serverlessFunctionsOverview.endpoint,
  params: routeDefinitions.metrics.serverlessFunctionsOverview.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServerlessFunctionsOverviewRouteResponse> => {
    const { params } = resources;
    const apmEventClient = await getApmEventClient(resources);

    const { serviceName } = params.path;
    const { environment, kuery, start, end } = params.query;

    const serverlessFunctionsOverview = await getServerlessFunctionsOverview({
      environment,
      start,
      end,
      kuery,
      apmEventClient,
      serviceName,
    });
    return { serverlessFunctionsOverview };
  },
});

const serverlessMetricsSummaryRoute = createApmServerRoute({
  endpoint: routeDefinitions.metrics.serverlessSummary.endpoint,
  params: routeDefinitions.metrics.serverlessSummary.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServerlessSummaryResponse> => {
    const { params, context } = resources;
    const {
      uiSettings: { client: uiSettingsClient },
    } = await context.core;

    const [apmEventClient, awsLambdaPriceFactor, awsLambdaRequestCostPerMillion] =
      await Promise.all([
        getApmEventClient(resources),
        uiSettingsClient
          .get<string>(apmAWSLambdaPriceFactor)
          .then((value): AWSLambdaPriceFactor => JSON.parse(value) as AWSLambdaPriceFactor),
        uiSettingsClient.get<number>(apmAWSLambdaRequestCostPerMillion),
      ]);

    const { serviceName } = params.path;
    const { environment, kuery, start, end, serverlessId } = params.query;

    return getServerlessSummary({
      environment,
      start,
      end,
      kuery,
      apmEventClient,
      serviceName,
      serverlessId,
      awsLambdaPriceFactor,
      awsLambdaRequestCostPerMillion,
    });
  },
});

export const metricsServerlessRouteRepository = {
  ...serverlessMetricsChartsRoute,
  ...serverlessMetricsSummaryRoute,
  ...serverlessMetricsFunctionsOverviewRoute,
  ...serverlessMetricsActiveInstancesRoute,
};
