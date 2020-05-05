/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter } from 'src/core/server';
import { SecurityPluginSetup } from '../../../security/server';
import { registerClusterLoadRoute } from './cluster';
import {
  registerPipelineDeleteRoute,
  registerPipelineLoadRoute,
  registerPipelineSaveRoute,
} from './pipeline';
import { registerPipelinesListRoute, registerPipelinesDeleteRoute } from './pipelines';
import { registerUpgradeRoute } from './upgrade';

export function registerRoutes(router: IRouter, security?: SecurityPluginSetup) {
  registerClusterLoadRoute(router);

  registerPipelineDeleteRoute(router);
  registerPipelineLoadRoute(router);
  registerPipelineSaveRoute(router, security);

  registerPipelinesListRoute(router);
  registerPipelinesDeleteRoute(router);

  registerUpgradeRoute(router);
}
