/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteInitializerDeps } from '../';
import { initializeFindCustomElementsRoute } from './find';
import { initializeGetCustomElementRoute } from './get';
import { initializeCreateCustomElementRoute } from './create';
import { initializeUpdateCustomElementRoute } from './update';
import { initializeDeleteCustomElementRoute } from './delete';

export function initCustomElementsRoutes(deps: RouteInitializerDeps) {
  initializeFindCustomElementsRoute(deps);
  initializeGetCustomElementRoute(deps);
  initializeCreateCustomElementRoute(deps);
  initializeUpdateCustomElementRoute(deps);
  initializeDeleteCustomElementRoute(deps);
}
