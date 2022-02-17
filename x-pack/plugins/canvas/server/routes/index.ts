/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter, Logger } from 'src/core/server';
import { ExpressionsServerSetup } from 'src/plugins/expressions/server';
import { BfetchServerSetup } from 'src/plugins/bfetch/server';
import { initCustomElementsRoutes } from './custom_elements';
import { initESFieldsRoutes } from './es_fields';
import { initShareablesRoutes } from './shareables';
import { initWorkpadRoutes } from './workpad';
import { initTemplateRoutes } from './templates';
import { initFunctionsRoutes } from './functions';
import { CanvasRouteHandlerContext } from '../workpad_route_context';

export interface RouteInitializerDeps {
  router: IRouter<CanvasRouteHandlerContext>;
  logger: Logger;
  expressions: ExpressionsServerSetup;
  bfetch: BfetchServerSetup;
}

export function initRoutes(deps: RouteInitializerDeps) {
  initCustomElementsRoutes(deps);
  initESFieldsRoutes(deps);
  initShareablesRoutes(deps);
  initWorkpadRoutes(deps);
  initTemplateRoutes(deps);
  initFunctionsRoutes(deps);
}
