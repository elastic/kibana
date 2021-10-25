/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../types';

import {
  registerGetRoutes,
  registerCreateRoute,
  registerUpdateRoute,
  registerPrivilegesRoute,
  registerDeleteRoute,
  registerSimulateRoute,
  registerDocumentsRoute,
  registerParseCsvRoute,
} from './api';

export class ApiRoutes {
  setup(dependencies: RouteDependencies) {
    registerGetRoutes(dependencies);
    registerCreateRoute(dependencies);
    registerUpdateRoute(dependencies);
    registerPrivilegesRoute(dependencies);
    registerDeleteRoute(dependencies);
    registerSimulateRoute(dependencies);
    registerDocumentsRoute(dependencies);
    registerParseCsvRoute(dependencies);
  }
}
