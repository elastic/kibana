/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { environmentRt, kueryRt, rangeRt } from '../default_api_types';
import { FetchAndTransformMetrics } from './fetch_and_transform_metrics';
import { getMetricsChartDataByAgent } from './get_metrics_chart_data_by_agent';
import { getServiceNodes, ServiceNodesResponse } from './get_service_nodes';
import { metricsServerlessRouteRepository } from './serverless/route';

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
    const { params, config } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const { serviceName } = params.path;
    const { agentName, environment, kuery, serviceNodeName, start, end } =
      params.query;

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
  endpoint: 'GET /internal/apm/services/{serviceName}/metrics/nodes',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([kueryRt, rangeRt, environmentRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{ serviceNodes: ServiceNodesResponse }> => {
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
