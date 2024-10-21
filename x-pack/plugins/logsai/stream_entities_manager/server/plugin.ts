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
import { StreamEntitiesManagerConfig, configSchema, exposeToBrowserConfig } from '../common/config';
import { installStreamEntitiesManagerTemplates } from './templates/manage_index_templates';
import { StreamEntitiesManagerRouteRepository } from './routes';
import { RouteDependencies } from './routes/types';
import { ApiKeySavedObject, DefinitionSavedObject } from './saved_objects';
import {
  StreamEntitiesManagerPluginSetupDependencies,
  StreamEntitiesManagerPluginStartDependencies,
  StreamEntitiesManagerServer,
} from './types';
import { ApiScraperTask } from './lib/api/tasks/api_scraper_task';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StreamEntitiesManagerServerPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StreamEntitiesManagerServerPluginStart {}

export const config: PluginConfigDescriptor<StreamEntitiesManagerConfig> = {
  schema: configSchema,
  exposeToBrowser: exposeToBrowserConfig,
};

export class StreamEntitiesManagerServerPlugin
  implements
    Plugin<
      StreamEntitiesManagerServerPluginSetup,
      StreamEntitiesManagerServerPluginStart,
      StreamEntitiesManagerPluginSetupDependencies,
      StreamEntitiesManagerPluginStartDependencies
    >
{
  public config: StreamEntitiesManagerConfig;
  public logger: Logger;
  public server?: StreamEntitiesManagerServer;

  constructor(context: PluginInitializerContext<StreamEntitiesManagerConfig>) {
    this.config = context.config.get();
    this.logger = context.logger.get();
  }

  public setup(
    core: CoreSetup,
    plugins: StreamEntitiesManagerPluginSetupDependencies
  ): StreamEntitiesManagerServerPluginSetup {
    core.savedObjects.registerType(DefinitionSavedObject);
    core.savedObjects.registerType(ApiKeySavedObject);

    plugins.encryptedSavedObjects.registerType({
      type: ApiKeySavedObject.name,
      attributesToEncrypt: new Set(['apiKey']),
      attributesToIncludeInAAD: new Set(['id', 'name']),
    });

    this.server = {
      config: this.config,
      logger: this.logger,
    } as StreamEntitiesManagerServer;

    const apiScraperTask = new ApiScraperTask(plugins.taskManager, this.server);

    registerRoutes<RouteDependencies>({
      repository: StreamEntitiesManagerRouteRepository,
      dependencies: {
        server: this.server,
        tasks: {
          apiScraperTask,
        },
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

  public start(
    core: CoreStart,
    plugins: StreamEntitiesManagerPluginStartDependencies
  ): StreamEntitiesManagerServerPluginStart {
    if (this.server) {
      this.server.core = core;
      this.server.isServerless = core.elasticsearch.getCapabilities().serverless;
      this.server.security = plugins.security;
      this.server.encryptedSavedObjects = plugins.encryptedSavedObjects;
      this.server.taskManager = plugins.taskManager;
    }

    const esClient = core.elasticsearch.client.asInternalUser;

    installStreamEntitiesManagerTemplates({ esClient, logger: this.logger }).catch((err) =>
      this.logger.error(err)
    );

    return {};
  }

  public stop() {}
}
