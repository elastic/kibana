/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter } from '../../../../../../src/core/server/http/router/router';
import { PLUGIN_ID } from '../../../common/constants/plugin';
import { DATA_STREAM_API_ROUTES } from '../../../common/constants/routes';

import { getListHandler } from './handlers';

export const registerRoutes = (router: IRouter) => {
  // List of data streams
  router.get(
    {
      path: DATA_STREAM_API_ROUTES.LIST_PATTERN,
      validate: false,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getListHandler
  );
};
