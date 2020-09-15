/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { initializeGetFunctionsRoute, initializeBatchFunctionsRoute } from './functions';
import { RouteInitializerDeps } from '..';

export function initFunctionsRoutes(deps: RouteInitializerDeps) {
  initializeGetFunctionsRoute(deps);
  initializeBatchFunctionsRoute(deps);
}
