/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteInitializerDeps } from '../';
import { initializeFindWorkpadsRoute } from './find';
import { initializeGetWorkpadRoute } from './get';
import { initializeCreateWorkpadRoute } from './create';
import { initializeUpdateWorkpadRoute, initializeUpdateWorkpadAssetsRoute } from './update';
import { initializeDeleteWorkpadRoute } from './delete';

export function initWorkpadRoutes(deps: RouteInitializerDeps) {
  initializeFindWorkpadsRoute(deps);
  initializeGetWorkpadRoute(deps);
  initializeCreateWorkpadRoute(deps);
  initializeUpdateWorkpadRoute(deps);
  initializeUpdateWorkpadAssetsRoute(deps);
  initializeDeleteWorkpadRoute(deps);
}
