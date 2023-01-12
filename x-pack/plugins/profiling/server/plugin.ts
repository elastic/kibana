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
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { ProfilingConfig } from '.';
import { PROFILING_FEATURE } from './feature';
import { registerRoutes } from './routes';
import {
  ProfilingPluginSetup,
  ProfilingPluginSetupDeps,
  ProfilingPluginStart,
  ProfilingPluginStartDeps,
  ProfilingRequestHandlerContext,
} from './types';
import { createProfilingEsClient } from './utils/create_profiling_es_client';

export class ProfilingPlugin
  implements
    Plugin<
      ProfilingPluginSetup,
      ProfilingPluginStart,
      ProfilingPluginSetupDeps,
      ProfilingPluginStartDeps
    >
{
  private readonly logger: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext<ProfilingConfig>) {
    this.initializerContext = initializerContext;
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup<ProfilingPluginStartDeps>, deps: ProfilingPluginSetupDeps) {
    this.logger.debug('profiling: Setup');
    const router = core.http.createRouter<ProfilingRequestHandlerContext>();

    deps.features.registerKibanaFeature(PROFILING_FEATURE);

    const config = this.initializerContext.config.get();

    core.getStartServices().then(([coreStart, depsStart]) => {
      const profilingSpecificEsClient = config.elasticsearch
        ? coreStart.elasticsearch.createClient('profiling', {
            hosts: [config.elasticsearch.hosts],
            username: config.elasticsearch.username,
            password: config.elasticsearch.password,
          })
        : undefined;

      registerRoutes({
        router,
        logger: this.logger!,
        dependencies: {
          start: depsStart,
          setup: deps,
        },
        services: {
          createProfilingEsClient: ({ request, esClient: defaultEsClient }) => {
            const esClient = profilingSpecificEsClient
              ? profilingSpecificEsClient.asScoped(request).asInternalUser
              : defaultEsClient;

            return createProfilingEsClient({ request, esClient });
          },
          // FIXME
          //  @dgieselaar how to get the client?
          savedObjectsClient: {} as SavedObjectsClientContract,
        },
      });
    });

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('profiling: Started');
    return {};
  }

  public stop() {}
}
