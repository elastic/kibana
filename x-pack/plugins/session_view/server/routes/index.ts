/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '../../../../../src/core/server';
import { registerTestRoute } from './test_route';
import { registerTestSavedObjectsRoute } from './test_saved_objects_route';

export const registerRoutes = (router: IRouter) => {
  registerTestRoute(router);
  registerTestSavedObjectsRoute(router);
};
