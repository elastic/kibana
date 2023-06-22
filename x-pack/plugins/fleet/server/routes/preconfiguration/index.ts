/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetAuthzRouter } from '../../services/security';

import { PRECONFIGURATION_API_ROUTES } from '../../constants';
import { PostResetOnePreconfiguredAgentPoliciesSchema } from '../../types';

import { resetPreconfigurationHandler, resetOnePreconfigurationHandler } from './handler';

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.post(
    {
      path: PRECONFIGURATION_API_ROUTES.RESET_PATTERN,
      validate: false,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    resetPreconfigurationHandler
  );
  router.post(
    {
      path: PRECONFIGURATION_API_ROUTES.RESET_ONE_PATTERN,
      validate: PostResetOnePreconfiguredAgentPoliciesSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    resetOnePreconfigurationHandler
  );
};
