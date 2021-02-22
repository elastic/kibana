/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { setupRequest } from '../lib/helpers/setup_request';
import { getMetricsChartDataByAgent } from '../lib/metrics/get_metrics_chart_data_by_agent';
import { createRoute } from './create_route';
import { environmentRt, uiFiltersRt, rangeRt } from './default_api_types';

export const metricsChartsRoute = createRoute({
  endpoint: `GET /api/apm/services/{serviceName}/metrics/charts`,
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
      uiFiltersRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { params } = context;
    const { serviceName } = params.path;
    const { agentName, environment, serviceNodeName } = params.query;
    return await getMetricsChartDataByAgent({
      environment,
      setup,
      serviceName,
      agentName,
      serviceNodeName,
    });
  },
});
