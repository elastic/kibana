/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { environmentRt } from '../../../common/environment_rt';
import { TraceSearchType } from '../../../common/trace_explorer';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { createApmServerRouteRepository } from '../apm_routes/create_apm_server_route_repository';
import { rangeRt } from '../default_api_types';
import { executeTraceSearch } from './execute_trace_search';

const traceExplorerDataRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/trace_explorer/trace_data',
  params: t.type({
    query: t.intersection([
      rangeRt,
      environmentRt,
      t.type({
        type: t.union([
          t.literal(TraceSearchType.kql),
          t.literal(TraceSearchType.eql),
        ]),
        query: t.string,
      }),
    ]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (resources) => {
    const { request } = resources;

    const [coreStart, taskManagerStart, securityStart] = await Promise.all([
      resources.core.start(),
      resources.plugins.taskManager!.start(),
      resources.plugins.security!.start(),
    ]);

    const {
      params: {
        query: { start, end, environment, type, query },
      },
    } = resources;

    return {
      traceData: await executeTraceSearch({
        params: {
          query,
          type,
          environment,
          start,
          end,
          pageSize: 1000,
        },
        request,
        savedObjectsClient: coreStart.savedObjects.getScopedClient(request),
        taskManagerStart,
        securityStart,
      }),
    };
  },
});

export const traceExplorerRouteRepository =
  createApmServerRouteRepository().add(traceExplorerDataRoute);
