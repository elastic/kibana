/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  MetricsSummaryPluginSetup,
  MetricsSummaryPluginStart,
  MetricsSummaryRequestHandlerContext,
} from './types';
import { getTransforms, postTransforms } from './routes';
import { MetricsSummaryClient } from './services/metrics_entities_client';
import { deleteTransforms } from './routes/delete_transforms';

export class MetricsSummaryPlugin
  implements Plugin<MetricsSummaryPluginSetup, MetricsSummaryPluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup): MetricsSummaryPluginSetup {
    const router = core.http.createRouter();

    core.http.registerRouteHandlerContext<MetricsSummaryRequestHandlerContext, 'metricsSummary'>(
      'metricsSummary',
      this.createRouteHandlerContext()
    );

    // Register server side APIs
    // TODO: Add all of these into a separate file and call that file called init_routes.ts
    getTransforms(router);
    postTransforms(router);
    deleteTransforms(router);

    return {
      getMetricsSummaryClient: (esClient): MetricsSummaryClient =>
        new MetricsSummaryClient({
          esClient,
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
        core: {
          elasticsearch: {
            client: { asCurrentUser: esClient },
          },
        },
      } = context;
      return {
        getMetricsSummaryClient: (): MetricsSummaryClient =>
          new MetricsSummaryClient({
            esClient,
            logger: this.logger,
          }),
      };
    };
  };
}
