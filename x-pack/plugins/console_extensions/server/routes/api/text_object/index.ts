/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDependencies } from './types';

import { registerGetAllRoute } from './get_all';
import { registerCreateRoute } from './create';
import { registerUpdateRoute } from './update';

export const registerTextObjectsRoutes = (deps: RouteDependencies) => {
  registerCreateRoute(deps);
  registerGetAllRoute(deps);
  registerUpdateRoute(deps);
};
