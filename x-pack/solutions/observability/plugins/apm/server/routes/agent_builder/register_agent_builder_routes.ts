/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { registerRoutes } from '@kbn/server-route-repository';
import type { APMRouteHandlerResources } from '../apm_routes/register_apm_server_routes';
import type { APMCore } from '../typings';
import { agentBuilderRouteRepository } from './route';

export function registerAgentBuilderRoutes({
  core,
  plugins,
  logger,
}: {
  core: APMCore;
  plugins: APMRouteHandlerResources['plugins'];
  logger: Logger;
}) {
  registerRoutes({
    core: core.setup,
    logger,
    repository: agentBuilderRouteRepository,
    dependencies: {
      core,
      plugins,
      logger,
    },
    runDevModeChecks: false,
  });
}
