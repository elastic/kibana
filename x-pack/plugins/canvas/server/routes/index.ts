/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, Logger } from 'src/core/server';
import { initWorkpadRoutes } from './workpad';
import { initCustomElementsRoutes } from './custom_elements';
import { initESFieldsRoutes } from './es_fields';

export interface RouteInitializerDeps {
  router: IRouter;
  logger: Logger;
}

export function initRoutes(deps: RouteInitializerDeps) {
  initWorkpadRoutes(deps);
  initCustomElementsRoutes(deps);
  initESFieldsRoutes(deps);
}
