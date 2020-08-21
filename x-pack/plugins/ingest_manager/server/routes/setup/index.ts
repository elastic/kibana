/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter } from 'src/core/server';

import { PLUGIN_ID, FLEET_SETUP_API_ROUTES, SETUP_API_ROUTE } from '../../constants';
import { IngestManagerConfigType } from '../../../common';
import {
  getFleetStatusHandler,
  createFleetSetupHandler,
  ingestManagerSetupHandler,
} from './handlers';
import { PostFleetSetupRequestSchema } from '../../types';

export const registerIngestManagerSetupRoute = (router: IRouter) => {
  router.post(
    {
      path: SETUP_API_ROUTE,
      validate: false,
      // if this route is set to `-all`, a read-only user get a 404 for this route
      // and will see `Unable to initialize Ingest Manager` in the UI
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    ingestManagerSetupHandler
  );
};

export const registerCreateFleetSetupRoute = (router: IRouter) => {
  router.post(
    {
      path: FLEET_SETUP_API_ROUTES.CREATE_PATTERN,
      validate: PostFleetSetupRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    createFleetSetupHandler
  );
};

export const registerGetFleetStatusRoute = (router: IRouter) => {
  router.get(
    {
      path: FLEET_SETUP_API_ROUTES.INFO_PATTERN,
      validate: false,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getFleetStatusHandler
  );
};

export const registerRoutes = (router: IRouter, config: IngestManagerConfigType) => {
  // Ingest manager setup
  registerIngestManagerSetupRoute(router);

  if (!config.fleet.enabled) {
    return;
  }

  // Get Fleet setup
  registerGetFleetStatusRoute(router);

  // Create Fleet setup
  registerCreateFleetSetupRoute(router);
};
