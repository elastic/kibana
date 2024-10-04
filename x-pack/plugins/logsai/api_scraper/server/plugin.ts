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
import { ApiScraperConfig, configSchema, exposeToBrowserConfig } from '../common/config';
import { installApiScraperTemplates } from './templates/manage_index_templates';
import { apiScraperRouteRepository } from './routes';
import { ApiScraperRouteDependencies } from './routes/types';
import { apiScraperApiKeyType, apiScraperDefinition } from './saved_objects';
import {
  ApiScraperPluginSetupDependencies,
  ApiScraperPluginStartDependencies,
  ApiScraperServer,
} from './types';
import { ApiScraperTask } from './lib/api/tasks/api_scraper_task';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ApiScraperServerPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ApiScraperServerPluginStart {}

export const config: PluginConfigDescriptor<ApiScraperConfig> = {
  schema: configSchema,
  exposeToBrowser: exposeToBrowserConfig,
};

export class ApiScraperServerPlugin
  implements
    Plugin<
      ApiScraperServerPluginSetup,
      ApiScraperServerPluginStart,
      ApiScraperPluginSetupDependencies,
      ApiScraperPluginStartDependencies
    >
{
  public config: ApiScraperConfig;
  public logger: Logger;
  public server?: ApiScraperServer;

  constructor(context: PluginInitializerContext<ApiScraperConfig>) {
    this.config = context.config.get();
    this.logger = context.logger.get();
  }

  public setup(
    core: CoreSetup,
    plugins: ApiScraperPluginSetupDependencies
  ): ApiScraperServerPluginSetup {
    core.savedObjects.registerType(apiScraperDefinition);
    core.savedObjects.registerType(apiScraperApiKeyType);

    plugins.encryptedSavedObjects.registerType({
      type: apiScraperApiKeyType.name,
      attributesToEncrypt: new Set(['apiKey']),
      attributesToIncludeInAAD: new Set(['id', 'name']),
    });

    this.server = {
      config: this.config,
      logger: this.logger,
    } as ApiScraperServer;

    const apiScraperTask = new ApiScraperTask(plugins.taskManager, this.server);

    registerRoutes<ApiScraperRouteDependencies>({
      repository: apiScraperRouteRepository,
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
    plugins: ApiScraperPluginStartDependencies
  ): ApiScraperServerPluginStart {
    if (this.server) {
      this.server.core = core;
      this.server.isServerless = core.elasticsearch.getCapabilities().serverless;
      this.server.security = plugins.security;
      this.server.encryptedSavedObjects = plugins.encryptedSavedObjects;
      this.server.taskManager = plugins.taskManager;
    }

    const esClient = core.elasticsearch.client.asInternalUser;

    installApiScraperTemplates({ esClient, logger: this.logger }).catch((err) =>
      this.logger.error(err)
    );

    return {};
  }

  public stop() {}
}
