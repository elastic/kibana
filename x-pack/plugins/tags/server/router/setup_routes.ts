/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createRoute } from './routes/create';
import { RouteParams } from './types';

export const setupRoutes = (params: RouteParams) => {
  createRoute(params);
};
