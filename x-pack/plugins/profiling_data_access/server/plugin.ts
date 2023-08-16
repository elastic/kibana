/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Plugin,
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Logger,
} from '@kbn/core/server';
import { ProfilingConfig } from '.';
import { registerRoutes } from './routes/register_routes';
import { registerServices } from './services/register_services';
import { ProfilingRequestHandlerContext } from './types';
import { createProfilingEsClient } from './utils/create_profiling_es_client';

export type ProfilingDataAccessPluginSetup = ReturnType<ProfilingDataAccessPlugin['setup']>;
export type ProfilingDataAccessPluginStart = ReturnType<ProfilingDataAccessPlugin['start']>;

export class ProfilingDataAccessPlugin implements Plugin {
  private readonly logger: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext<ProfilingConfig>) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    const router = core.http.createRouter<ProfilingRequestHandlerContext>();

    core.getStartServices().then(() => {
      registerRoutes({
        router,
        logger: this.logger!,
      });
    });
  }

  public start(core: CoreStart) {
    const config = this.initializerContext.config.get();

    const profilingSpecificEsClient = config.elasticsearch
      ? core.elasticsearch.createClient('profiling', {
          hosts: [config.elasticsearch.hosts],
          username: config.elasticsearch.username,
          password: config.elasticsearch.password,
        })
      : undefined;

    const services = registerServices({
      createProfilingEsClient: ({ esClient: defaultEsClient, useDefaultAuth = false }) => {
        const esClient =
          profilingSpecificEsClient && !useDefaultAuth
            ? profilingSpecificEsClient.asInternalUser
            : defaultEsClient;

        return createProfilingEsClient({ esClient });
      },
    });

    // called after all plugins are set up
    return {
      services,
    };
  }
}
