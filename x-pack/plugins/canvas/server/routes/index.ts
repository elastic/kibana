/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, Logger, ElasticsearchServiceSetup } from 'src/core/server';
import { ExpressionsServerSetup } from 'src/plugins/expressions/server';
import { BfetchServerSetup } from 'src/plugins/bfetch/server';
import { initCustomElementsRoutes } from './custom_elements';
import { initESFieldsRoutes } from './es_fields';
import { initShareablesRoutes } from './shareables';
import { initWorkpadRoutes } from './workpad';
import { initTemplateRoutes } from './templates';
import { initFunctionsRoutes } from './functions';

export interface RouteInitializerDeps {
  router: IRouter;
  logger: Logger;
  expressions: ExpressionsServerSetup;
  bfetch: BfetchServerSetup;
  elasticsearch: ElasticsearchServiceSetup;
}

export function initRoutes(deps: RouteInitializerDeps) {
  initCustomElementsRoutes(deps);
  initESFieldsRoutes(deps);
  initShareablesRoutes(deps);
  initWorkpadRoutes(deps);
  initTemplateRoutes(deps);
  initFunctionsRoutes(deps);
}
