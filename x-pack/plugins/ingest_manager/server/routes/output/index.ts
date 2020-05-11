/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'src/core/server';
import { PLUGIN_ID, OUTPUT_API_ROUTES } from '../../constants';
import { getOneOuputHandler, getOutputsHandler, putOuputHandler } from './handler';
import {
  GetOneOutputRequestSchema,
  GetOutputsRequestSchema,
  PutOutputRequestSchema,
} from '../../types';

export const registerRoutes = (router: IRouter) => {
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
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    putOuputHandler
  );
};
