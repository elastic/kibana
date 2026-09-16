/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  routeDefinitions,
  type MetricsChartsResponse,
  type ServiceMetricsNodesRouteResponse,
} from '@kbn/apm-api-shared';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getMetricsChartDataByAgent } from './get_metrics_chart_data_by_agent';
import { getServiceNodes } from './get_service_nodes';
import { metricsServerlessRouteRepository } from './serverless/route';

const metricsChartsRoute = createApmServerRoute({
  endpoint: routeDefinitions.metrics.charts.endpoint,
  params: routeDefinitions.metrics.charts.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<MetricsChartsResponse> => {
    const { params, config } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const { serviceName } = params.path;
    const { agentName, environment, kuery, serviceNodeName, start, end } = params.query;

    const charts = await getMetricsChartDataByAgent({
      environment,
      kuery,
      config,
      apmEventClient,
      serviceName,
      agentName,
      serviceNodeName,
      start,
      end,
    });

    return { charts };
  },
});

const serviceMetricsJvm = createApmServerRoute({
  endpoint: routeDefinitions.metrics.nodes.endpoint,
  params: routeDefinitions.metrics.nodes.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServiceMetricsNodesRouteResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { kuery, environment, start, end } = params.query;

    const serviceNodes = await getServiceNodes({
      kuery,
      apmEventClient,
      serviceName,
      environment,
      start,
      end,
    });
    return { serviceNodes };
  },
});

export const metricsRouteRepository = {
  ...metricsChartsRoute,
  ...serviceMetricsJvm,
  ...metricsServerlessRouteRepository,
};
