/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from 'src/core/server';

import { PLUGIN_ID, AGENTS_SETUP_API_ROUTES, SETUP_API_ROUTE } from '../../constants';
import { FleetConfigType } from '../../../common';
import { getFleetStatusHandler, createFleetSetupHandler, FleetSetupHandler } from './handlers';
import { PostFleetSetupRequestSchema } from '../../types';

export const registerFleetSetupRoute = (router: IRouter) => {
  router.post(
    {
      path: SETUP_API_ROUTE,
      validate: false,
      // if this route is set to `-all`, a read-only user get a 404 for this route
      // and will see `Unable to initialize Ingest Manager` in the UI
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    FleetSetupHandler
  );
};

export const registerCreateFleetSetupRoute = (router: IRouter) => {
  router.post(
    {
      path: AGENTS_SETUP_API_ROUTES.CREATE_PATTERN,
      validate: PostFleetSetupRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    createFleetSetupHandler
  );
};

export const registerGetFleetStatusRoute = (router: IRouter) => {
  router.get(
    {
      path: AGENTS_SETUP_API_ROUTES.INFO_PATTERN,
      validate: false,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getFleetStatusHandler
  );
};

export const registerRoutes = (router: IRouter, config: FleetConfigType) => {
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
