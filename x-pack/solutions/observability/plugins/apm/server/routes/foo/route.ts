/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApmServerRoute } from '../apm_routes/create_apm_server_route';

const fooRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/foo',
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (): Promise<{ msg: string }> => {
    return { msg: 'bar' };
  },
});

export const fooRouteRepository = { ...fooRoute };
