/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter } from 'kibana/server';
import { PLUGIN_ID, FLEET_SETUP_API_ROUTES } from '../../constants';
import { GetFleetSetupRequestSchema, CreateFleetSetupRequestSchema } from '../../types';
import { getFleetSetupHandler, createFleetSetupHandler } from './handlers';

export const registerRoutes = (router: IRouter) => {
  // Get
  router.get(
    {
      path: FLEET_SETUP_API_ROUTES.INFO_PATTERN,
      validate: GetFleetSetupRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    getFleetSetupHandler
  );

  // Create
  router.post(
    {
      path: FLEET_SETUP_API_ROUTES.CREATE_PATTERN,
      validate: CreateFleetSetupRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}`] },
    },
    createFleetSetupHandler
  );
};
