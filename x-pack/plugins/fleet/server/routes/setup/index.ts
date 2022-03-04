/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENTS_SETUP_API_ROUTES, SETUP_API_ROUTE } from '../../constants';
import type { FleetConfigType } from '../../../common';

import type { FleetAuthzRouter } from '../security';

import { getFleetStatusHandler, fleetSetupHandler } from './handlers';

export const registerFleetSetupRoute = (router: FleetAuthzRouter) => {
  router.post(
    {
      path: SETUP_API_ROUTE,
      validate: false,
      fleetAuthz: {
        fleet: { setup: true },
      },
    },
    fleetSetupHandler
  );
};

// That route is used by agent to setup Fleet
export const registerCreateFleetSetupRoute = (router: FleetAuthzRouter) => {
  router.post(
    {
      path: AGENTS_SETUP_API_ROUTES.CREATE_PATTERN,
      validate: false,
      fleetAuthz: {
        fleet: { setup: true },
      },
    },
    fleetSetupHandler
  );
};

export const registerGetFleetStatusRoute = (router: FleetAuthzRouter) => {
  router.get(
    {
      path: AGENTS_SETUP_API_ROUTES.INFO_PATTERN,
      validate: false,
      fleetAuthz: {
        fleet: { setup: true },
      },
    },
    getFleetStatusHandler
  );
};

export const registerRoutes = (router: FleetAuthzRouter, config: FleetConfigType) => {
  // Ingest manager setup
  registerFleetSetupRoute(router);

  if (!config.agents.enabled) {
    return;
  }

  // Get Fleet setup
  registerGetFleetStatusRoute(router);

  // Create Fleet setup
  registerCreateFleetSetupRoute(router);
};
