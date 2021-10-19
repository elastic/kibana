/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PLUGIN_ID, AGENTS_SETUP_API_ROUTES, SETUP_API_ROUTE } from '../../constants';
import type { FleetConfigType } from '../../../common';

import type { FleetRouter } from '../../types/request_context';

import { getFleetStatusHandler, fleetSetupHandler } from './handlers';

export const registerFleetSetupRoute = (router: FleetRouter) => {
  router.post(
    {
      path: SETUP_API_ROUTE,
      validate: false,
    },
    fleetSetupHandler
  );
};

// That route is used by agent to setup Fleet
export const registerCreateFleetSetupRoute = (router: FleetRouter) => {
  router.post(
    {
      path: AGENTS_SETUP_API_ROUTES.CREATE_PATTERN,
      validate: false,
    },
    fleetSetupHandler
  );
};

export const registerGetFleetStatusRoute = (router: FleetRouter) => {
  router.get(
    {
      path: AGENTS_SETUP_API_ROUTES.INFO_PATTERN,
      validate: false,
      // Disable this tag and the automatic RBAC support until elastic/fleet-server access is removed in 8.0
      // Required to allow elastic/fleet-server to access this API.
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getFleetStatusHandler
  );
};

export const registerRoutes = (router: FleetRouter, config: FleetConfigType) => {
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
