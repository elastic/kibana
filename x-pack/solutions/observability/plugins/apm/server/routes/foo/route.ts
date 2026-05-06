/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { routeDefinitions, type FooResponse } from '@kbn/apm-api-shared';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';

const fooRoute = createApmServerRoute({
  endpoint: routeDefinitions.foo.foo.endpoint,
  params: routeDefinitions.foo.foo.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<FooResponse> => {
    return { msg: resources.params.query.foo ?? 'hello world' };
  },
});

export const fooRouteRepository = { ...fooRoute };
