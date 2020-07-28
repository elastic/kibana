/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDependencies } from '../../../types';

import { registerGetAllRoute } from './get';
import { registerCreateRoute } from './create';
import { registerUpdateRoute } from './update';
import { registerDeleteRoute } from './delete';
import { registerPrivilegesRoute } from './privileges';

export function registerComponentTemplateRoutes(dependencies: RouteDependencies) {
  registerGetAllRoute(dependencies);
  registerCreateRoute(dependencies);
  registerUpdateRoute(dependencies);
  registerDeleteRoute(dependencies);
  registerPrivilegesRoute(dependencies);
}
