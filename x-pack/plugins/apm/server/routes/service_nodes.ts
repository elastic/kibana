/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createApmServerRouteRepository } from './create_apm_server_route_repository';
import { createApmServerRoute } from './create_apm_server_route';
import { setupRequest } from '../lib/helpers/setup_request';
import { getServiceNodes } from '../lib/service_nodes';
import { rangeRt, kueryRt } from './default_api_types';

const serviceNodesRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/serviceNodes',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([kueryRt, rangeRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { kuery } = params.query;

    const serviceNodes = await getServiceNodes({ kuery, setup, serviceName });
    return { serviceNodes };
  },
});

export const serviceNodeRouteRepository = createApmServerRouteRepository().add(
  serviceNodesRoute
);
