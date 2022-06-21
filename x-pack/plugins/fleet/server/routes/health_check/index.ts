/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_API_ROUTES } from '../../constants';
import type { FleetRequestHandler } from '../../types';
import type { FleetAuthzRouter } from '../security';

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.get(
    {
      path: APP_API_ROUTES.HEALTH_CHECK_PATTERN,
      validate: {},
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    getHealthCheckHandler
  );
};

export const getHealthCheckHandler: FleetRequestHandler<undefined, undefined, undefined> = async (
  context,
  request,
  response
) => {
  return response.ok({
    body: 'Fleet Health Check Report:\nFleet Server: HEALTHY',
    headers: { 'content-type': 'text/plain' },
  });
};
