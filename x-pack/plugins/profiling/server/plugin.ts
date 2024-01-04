/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { ProfilingConfig } from '.';
import { PROFILING_FEATURE, PROFILING_SERVER_FEATURE_ID } from './feature';
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
    const router = core.http.createRouter<ProfilingRequestHandlerContext>();

    deps.features.registerKibanaFeature(PROFILING_FEATURE);

    const config = this.initializerContext.config.get();
    const stackVersion = this.initializerContext.env.packageInfo.version;

    const telemetryUsageCounter = deps.usageCollection?.createUsageCounter(
      PROFILING_SERVER_FEATURE_ID
    );

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
          config,
          stackVersion,
          telemetryUsageCounter,
        },
        services: {
          createProfilingEsClient: ({
            request,
            esClient: defaultEsClient,
            useDefaultAuth = false,
          }) => {
            const esClient =
              profilingSpecificEsClient && !useDefaultAuth
                ? profilingSpecificEsClient.asScoped(request).asInternalUser
                : defaultEsClient;

            return createProfilingEsClient({ request, esClient });
          },
        },
      });
    });

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
