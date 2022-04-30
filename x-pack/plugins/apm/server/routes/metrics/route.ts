/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { setupRequest } from '../../lib/helpers/setup_request';
import { getMetricsChartDataByAgent } from './get_metrics_chart_data_by_agent';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { createApmServerRouteRepository } from '../apm_routes/create_apm_server_route_repository';
import { environmentRt, kueryRt, rangeRt } from '../default_api_types';

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
  handler: async (resources) => {
    const { params } = resources;
    const setup = await setupRequest(resources);
    const { serviceName } = params.path;
    const { agentName, environment, kuery, serviceNodeName, start, end } =
      params.query;

    const charts = await getMetricsChartDataByAgent({
      environment,
      kuery,
      setup,
      serviceName,
      agentName,
      serviceNodeName,
      start,
      end,
    });

    return { charts };
  },
});

export const metricsRouteRepository =
  createApmServerRouteRepository().add(metricsChartsRoute);
