/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteInitializerDeps } from '..';
import { initializeCreateWorkpadRoute } from './create';
import { initializeDeleteWorkpadRoute } from './delete';
import { initializeFindWorkpadsRoute } from './find';
import { initializeGetWorkpadRoute } from './get';
import { initializeImportWorkpadRoute } from './import';
import { initializeResolveWorkpadRoute } from './resolve';
import { initializeUpdateWorkpadAssetsRoute, initializeUpdateWorkpadRoute } from './update';

export function initWorkpadRoutes(deps: RouteInitializerDeps) {
  initializeFindWorkpadsRoute(deps);
  initializeResolveWorkpadRoute(deps);
  initializeGetWorkpadRoute(deps);
  initializeCreateWorkpadRoute(deps);
  initializeImportWorkpadRoute(deps);
  initializeUpdateWorkpadRoute(deps);
  initializeUpdateWorkpadAssetsRoute(deps);
  initializeDeleteWorkpadRoute(deps);
}
