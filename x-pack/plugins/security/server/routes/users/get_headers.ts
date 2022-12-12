/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '..';
import { createLicensedRouteHandler } from '../licensed_route_handler';

export function defineGetHeadersRoutes({ router }: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/users/_headers',
      validate: false,
    },
    createLicensedRouteHandler(async (context, request, response) => {
      return response.ok({ body: request.headers });
    })
  );
}
