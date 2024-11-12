/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  Plugin,
  PluginConfigDescriptor,
  PluginInitializerContext,
} from '@kbn/core/server';
import { registerRoutes } from '@kbn/server-route-repository';
import { StreamsConfig, configSchema, exposeToBrowserConfig } from '../common/config';
import { StreamsRouteRepository } from './routes';
import { RouteDependencies } from './routes/types';
import {
  StreamsPluginSetupDependencies,
  StreamsPluginStartDependencies,
  StreamsServer,
} from './types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StreamsPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StreamsPluginStart {}

export const config: PluginConfigDescriptor<StreamsConfig> = {
  schema: configSchema,
  exposeToBrowser: exposeToBrowserConfig,
};

export class StreamsPlugin
  implements
    Plugin<
      StreamsPluginSetup,
      StreamsPluginStart,
      StreamsPluginSetupDependencies,
      StreamsPluginStartDependencies
    >
{
  public config: StreamsConfig;
  public logger: Logger;
  public server?: StreamsServer;

  constructor(context: PluginInitializerContext<StreamsConfig>) {
    this.config = context.config.get();
    this.logger = context.logger.get();
  }

  public setup(core: CoreSetup, plugins: StreamsPluginSetupDependencies): StreamsPluginSetup {
    this.server = {
      config: this.config,
      logger: this.logger,
    } as StreamsServer;

    registerRoutes<RouteDependencies>({
      repository: StreamsRouteRepository,
      dependencies: {
        server: this.server,
        getScopedClients: async ({ request }: { request: KibanaRequest }) => {
          const [coreStart] = await core.getStartServices();
          const scopedClusterClient = coreStart.elasticsearch.client.asScoped(request);
          const soClient = coreStart.savedObjects.getScopedClient(request);
          return { scopedClusterClient, soClient };
        },
      },
      core,
      logger: this.logger,
    });

    return {};
  }

  public start(core: CoreStart, plugins: StreamsPluginStartDependencies): StreamsPluginStart {
    if (this.server) {
      this.server.core = core;
      this.server.isServerless = core.elasticsearch.getCapabilities().serverless;
      this.server.security = plugins.security;
      this.server.encryptedSavedObjects = plugins.encryptedSavedObjects;
      this.server.taskManager = plugins.taskManager;
    }

    return {};
  }

  public stop() {}
}
