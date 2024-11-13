/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreSetup, Logger } from '@kbn/core/server';
import { ServerRoute, registerRoutes } from '@kbn/server-route-repository';
import { ServerRouteCreateOptions } from '@kbn/server-route-repository-utils';
import { SLORoutesDependencies } from './types';

interface RegisterRoutes {
  core: CoreSetup;
  repository: Record<string, ServerRoute<string, any, any, any, ServerRouteCreateOptions>>;
  logger: Logger;
  dependencies: SLORoutesDependencies;
}

export function registerServerRoutes({ repository, core, logger, dependencies }: RegisterRoutes) {
  registerRoutes<SLORoutesDependencies>({
    repository,
    dependencies,
    core,
    logger,
  });
}
