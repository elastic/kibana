/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '../../../../src/core/server';

import {
  ContextProvider,
  ContextProviderReturn,
  MetricsEntitiesPluginSetup,
  MetricsEntitiesPluginStart,
  MetricsEntitiesRequestHandlerContext,
} from './types';
import { getTransforms, postTransforms } from './routes';
import { MetricsEntitiesClient } from './services/metrics_entities_client';
import { deleteTransforms } from './routes/delete_transforms';

export class MetricsEntitiesPlugin
  implements Plugin<MetricsEntitiesPluginSetup, MetricsEntitiesPluginStart>
{
  private readonly logger: Logger;
  private kibanaVersion: string;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup): MetricsEntitiesPluginSetup {
    const router = core.http.createRouter();

    core.http.registerRouteHandlerContext<MetricsEntitiesRequestHandlerContext, 'metricsEntities'>(
      'metricsEntities',
      this.createRouteHandlerContext()
    );

    // Register server side APIs
    // TODO: Add all of these into a separate file and call that file called init_routes.ts
    getTransforms(router);
    postTransforms(router);
    deleteTransforms(router);

    return {
      getMetricsEntitiesClient: (esClient): MetricsEntitiesClient =>
        new MetricsEntitiesClient({
          esClient,
          kibanaVersion: this.kibanaVersion,
          logger: this.logger,
        }),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public start(core: CoreStart): void {
    this.logger.debug('Starting plugin');
  }

  public stop(): void {
    this.logger.debug('Stopping plugin');
  }

  private createRouteHandlerContext = (): ContextProvider => {
    return async (context): ContextProviderReturn => {
      const {
        elasticsearch: {
          client: { asCurrentUser: esClient },
        },
      } = await context.core;
      return {
        getMetricsEntitiesClient: (): MetricsEntitiesClient =>
          new MetricsEntitiesClient({
            esClient,
            kibanaVersion: this.kibanaVersion,
            logger: this.logger,
          }),
      };
    };
  };
}
