/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, Logger } from 'src/core/server';
import { initCustomElementsRoutes } from './custom_elements';
import { initESFieldsRoutes } from './es_fields';
import { initShareablesRoutes } from './shareables';
import { initWorkpadRoutes } from './workpad';
import { initTemplateRoutes } from './templates';

export interface RouteInitializerDeps {
  router: IRouter;
  logger: Logger;
}

export function initRoutes(deps: RouteInitializerDeps) {
  initCustomElementsRoutes(deps);
  initESFieldsRoutes(deps);
  initShareablesRoutes(deps);
  initWorkpadRoutes(deps);
  initTemplateRoutes(deps);
}
