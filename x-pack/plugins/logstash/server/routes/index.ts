/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter, ICustomClusterClient } from 'src/core/server';
import { SecurityPluginSetup } from '../../../security/server';
import { registerClusterLoadRoute } from './cluster';
import {
  registerPipelineDeleteRoute,
  registerPipelineLoadRoute,
  registerPipelineSaveRoute,
} from './pipeline';
import { registerPipelinesListRoute, registerPipelinesDeleteRoute } from './pipelines';
import { registerUpgradeRoute } from './upgrade';

export function registerRoutes(
  router: IRouter,
  esClient: ICustomClusterClient,
  security?: SecurityPluginSetup
) {
  registerClusterLoadRoute(router, esClient);

  registerPipelineDeleteRoute(router, esClient);
  registerPipelineLoadRoute(router, esClient);
  registerPipelineSaveRoute(router, esClient, security);

  registerPipelinesListRoute(router, esClient);
  registerPipelinesDeleteRoute(router, esClient);

  registerUpgradeRoute(router, esClient);
}
