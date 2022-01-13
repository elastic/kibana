/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandler } from 'src/core/server';

import { PLUGIN_ID, PRECONFIGURATION_API_ROUTES } from '../../constants';
import { PutPreconfigurationSchema } from '../../types';

import {
  updatePreconfigurationHandler,
  resetPreconfigurationHandler,
  resetOnePreconfigurationHandler,
} from './handler';

export const registerRoutes = (router: IRouter) => {
  router.post(
    {
      path: PRECONFIGURATION_API_ROUTES.RESET_PATTERN,
      validate: false,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    resetPreconfigurationHandler as RequestHandler
  );
  router.post(
    {
      path: PRECONFIGURATION_API_ROUTES.RESET_ONE_PATTERN,
      validate: false,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    resetOnePreconfigurationHandler as RequestHandler
  );

  router.put(
    {
      path: PRECONFIGURATION_API_ROUTES.UPDATE_PATTERN,
      validate: PutPreconfigurationSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    updatePreconfigurationHandler as RequestHandler
  );
};
