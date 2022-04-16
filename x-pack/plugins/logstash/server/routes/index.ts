/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { LogstashPluginRouter } from '../types';
import { registerClusterLoadRoute } from './cluster';
import {
  registerPipelineDeleteRoute,
  registerPipelineLoadRoute,
  registerPipelineSaveRoute,
} from './pipeline';
import { registerPipelinesListRoute, registerPipelinesDeleteRoute } from './pipelines';

export function registerRoutes(router: LogstashPluginRouter, security?: SecurityPluginSetup) {
  registerClusterLoadRoute(router);

  registerPipelineDeleteRoute(router);
  registerPipelineLoadRoute(router);
  registerPipelineSaveRoute(router, security);

  registerPipelinesListRoute(router);
  registerPipelinesDeleteRoute(router);
}
