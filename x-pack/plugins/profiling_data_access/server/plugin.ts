/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { ProfilingConfig } from '.';
import { registerServices } from './services/register_services';
import { createProfilingEsClient } from './utils/create_profiling_es_client';
import { ProfilingPluginStartDeps } from './types';

export type ProfilingDataAccessPluginSetup = ReturnType<ProfilingDataAccessPlugin['setup']>;
export type ProfilingDataAccessPluginStart = ReturnType<ProfilingDataAccessPlugin['start']>;

export class ProfilingDataAccessPlugin implements Plugin {
  private readonly logger: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext<ProfilingConfig>) {
    this.logger = initializerContext.logger.get();
  }
  public setup(core: CoreSetup) {}

  public start(core: CoreStart, plugins: ProfilingPluginStartDeps) {
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
      logger: this.logger,
      deps: {
        fleet: plugins.fleet,
        cloud: plugins.cloud,
      },
    });

    // called after all plugins are set up
    return {
      services,
    };
  }
}
