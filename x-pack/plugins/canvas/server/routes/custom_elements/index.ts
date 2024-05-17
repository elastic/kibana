/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteInitializerDeps } from '..';
import { initializeCreateCustomElementRoute } from './create';
import { initializeDeleteCustomElementRoute } from './delete';
import { initializeFindCustomElementsRoute } from './find';
import { initializeGetCustomElementRoute } from './get';
import { initializeUpdateCustomElementRoute } from './update';

export function initCustomElementsRoutes(deps: RouteInitializerDeps) {
  initializeFindCustomElementsRoute(deps);
  initializeGetCustomElementRoute(deps);
  initializeCreateCustomElementRoute(deps);
  initializeUpdateCustomElementRoute(deps);
  initializeDeleteCustomElementRoute(deps);
}
