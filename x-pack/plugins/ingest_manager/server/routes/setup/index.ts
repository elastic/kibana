/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter } from 'src/core/server';
import { PLUGIN_ID, FLEET_SETUP_API_ROUTES, INGEST_SETUP_API_ROUTES } from '../../constants';
import { GetFleetSetupRequestSchema, CreateFleetSetupRequestSchema } from '../../types';
import {
  getFleetSetupHandler,
  createFleetSetupHandler,
  ingestManagerSetupHandler,
} from './handlers';

export const registerRoutes = (router: IRouter) => {
  // Ingest manager setup
  router.post(
    {
      path: INGEST_SETUP_API_ROUTES.CREATE_PATTERN,
      validate: false,
      // if this route is set to `-all`, a read-only user get a 404 for this route
      // and will see `Unable to initialize Ingest Manager` in the UI
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    ingestManagerSetupHandler
  );

  // Get Ingest setup is the same as fleet
  router.get(
    {
      path: INGEST_SETUP_API_ROUTES.INFO_PATTERN,
      validate: GetFleetSetupRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getFleetSetupHandler
  );

  // Get Fleet setup
  router.get(
    {
      path: FLEET_SETUP_API_ROUTES.INFO_PATTERN,
      validate: GetFleetSetupRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getFleetSetupHandler
  );

  // Create Fleet setup
  router.post(
    {
      path: FLEET_SETUP_API_ROUTES.CREATE_PATTERN,
      validate: CreateFleetSetupRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    createFleetSetupHandler
  );
};
