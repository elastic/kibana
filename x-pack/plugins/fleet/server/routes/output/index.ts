/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PLUGIN_ID, OUTPUT_API_ROUTES } from '../../constants';
import {
  DeleteOutputRequestSchema,
  GetOneOutputRequestSchema,
  GetOutputsRequestSchema,
  PostOutputRequestSchema,
  PutOutputRequestSchema,
} from '../../types';
import type { FleetAuthzRouter } from '../security';

import {
  deleteOutputHandler,
  getOneOuputHandler,
  getOutputsHandler,
  postOuputHandler,
  putOuputHandler,
} from './handler';

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.get(
    {
      path: OUTPUT_API_ROUTES.LIST_PATTERN,
      validate: GetOutputsRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getOutputsHandler
  );
  router.get(
    {
      path: OUTPUT_API_ROUTES.INFO_PATTERN,
      validate: GetOneOutputRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getOneOuputHandler
  );
  router.put(
    {
      path: OUTPUT_API_ROUTES.UPDATE_PATTERN,
      validate: PutOutputRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    putOuputHandler
  );

  router.post(
    {
      path: OUTPUT_API_ROUTES.CREATE_PATTERN,
      validate: PostOutputRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    postOuputHandler
  );

  router.delete(
    {
      path: OUTPUT_API_ROUTES.DELETE_PATTERN,
      validate: DeleteOutputRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    deleteOutputHandler
  );
};
