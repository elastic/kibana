/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Plugin,
  CoreSetup,
  RequestHandlerContext,
  CoreStart,
  PluginInitializerContext,
  PluginConfigDescriptor,
  Logger,
} from '@kbn/core/server';
import { upsertComponent, upsertTemplate } from './lib/manage_index_templates';
import { setupRoutes } from './routes';
import {
  EntityManagerPluginSetupDependencies,
  EntityManagerPluginStartDependencies,
  EntityManagerServerSetup,
} from './types';
import { EntityManagerConfig, configSchema, exposeToBrowserConfig } from '../common/config';
import { entitiesBaseComponentTemplateConfig } from './templates/components/base';
import { entitiesEventComponentTemplateConfig } from './templates/components/event';
import { entitiesIndexTemplateConfig } from './templates/entities_template';
import { entityDefinition, EntityDiscoveryApiKeyType } from './saved_objects';
import { entitiesEntityComponentTemplateConfig } from './templates/components/entity';

export type EntityManagerServerPluginSetup = ReturnType<EntityManagerServerPlugin['setup']>;
export type EntityManagerServerPluginStart = ReturnType<EntityManagerServerPlugin['start']>;

export const config: PluginConfigDescriptor<EntityManagerConfig> = {
  schema: configSchema,
  exposeToBrowser: exposeToBrowserConfig,
};

export class EntityManagerServerPlugin
  implements
    Plugin<
      EntityManagerServerPluginSetup,
      EntityManagerServerPluginStart,
      EntityManagerPluginSetupDependencies,
      EntityManagerPluginStartDependencies
    >
{
  public config: EntityManagerConfig;
  public logger: Logger;
  public server?: EntityManagerServerSetup;

  constructor(context: PluginInitializerContext<EntityManagerConfig>) {
    this.config = context.config.get();
    this.logger = context.logger.get();
  }

  public setup(core: CoreSetup, plugins: EntityManagerPluginSetupDependencies) {
    core.savedObjects.registerType(entityDefinition);
    core.savedObjects.registerType(EntityDiscoveryApiKeyType);
    plugins.encryptedSavedObjects.registerType({
      type: EntityDiscoveryApiKeyType.name,
      attributesToEncrypt: new Set(['apiKey']),
      attributesToIncludeInAAD: new Set(['id', 'name']),
    });

    const router = core.http.createRouter();

    this.server = {
      config: this.config,
      logger: this.logger,
    } as EntityManagerServerSetup;

    setupRoutes<RequestHandlerContext>({
      router,
      logger: this.logger,
      spaces: plugins.spaces,
      server: this.server,
    });

    return {};
  }

  public start(core: CoreStart, plugins: EntityManagerPluginStartDependencies) {
    if (this.server) {
      this.server.core = core;
      this.server.isServerless = core.elasticsearch.getCapabilities().serverless;
      this.server.security = plugins.security;
      this.server.encryptedSavedObjects = plugins.encryptedSavedObjects;
    }

    const esClient = core.elasticsearch.client.asInternalUser;

    // Install entities component templates and index template
    Promise.all([
      upsertComponent({
        esClient,
        logger: this.logger,
        component: entitiesBaseComponentTemplateConfig,
      }),
      upsertComponent({
        esClient,
        logger: this.logger,
        component: entitiesEventComponentTemplateConfig,
      }),
      upsertComponent({
        esClient,
        logger: this.logger,
        component: entitiesEntityComponentTemplateConfig,
      }),
    ])
      .then(() =>
        upsertTemplate({ esClient, logger: this.logger, template: entitiesIndexTemplateConfig })
      )
      .catch(() => {});

    return {};
  }

  public stop() {}
}
