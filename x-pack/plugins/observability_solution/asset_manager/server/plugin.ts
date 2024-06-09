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
import { assetsIndexTemplateConfig } from './templates/assets_template';
import { AssetClient } from './lib/asset_client';
import {
  AssetManagerPluginSetupDependencies,
  AssetManagerPluginStartDependencies,
  AssetManagerServerSetup,
} from './types';
import { AssetManagerConfig, configSchema, exposeToBrowserConfig } from '../common/config';
import { entitiesBaseComponentTemplateConfig } from './templates/components/base';
import { entitiesEventComponentTemplateConfig } from './templates/components/event';
import { entitiesIndexTemplateConfig } from './templates/entities_template';
import { entityDefinition, EntityDiscoveryApiKeyType } from './saved_objects';
import { entitiesEntityComponentTemplateConfig } from './templates/components/entity';

export type AssetManagerServerPluginSetup = ReturnType<AssetManagerServerPlugin['setup']>;
export type AssetManagerServerPluginStart = ReturnType<AssetManagerServerPlugin['start']>;

export const config: PluginConfigDescriptor<AssetManagerConfig> = {
  schema: configSchema,
  exposeToBrowser: exposeToBrowserConfig,
};

export class AssetManagerServerPlugin
  implements
    Plugin<
      AssetManagerServerPluginSetup,
      AssetManagerServerPluginStart,
      AssetManagerPluginSetupDependencies,
      AssetManagerPluginStartDependencies
    >
{
  public config: AssetManagerConfig;
  public logger: Logger;
  public server?: AssetManagerServerSetup;

  constructor(context: PluginInitializerContext<AssetManagerConfig>) {
    this.config = context.config.get();
    this.logger = context.logger.get();
  }

  public setup(core: CoreSetup, plugins: AssetManagerPluginSetupDependencies) {
    // Check for config value and bail out if not "alpha-enabled"
    if (!this.config.alphaEnabled) {
      this.logger.info('Server is NOT enabled');
      return;
    }

    this.logger.info('Server is enabled');

    core.savedObjects.registerType(entityDefinition);
    core.savedObjects.registerType(EntityDiscoveryApiKeyType);
    plugins.encryptedSavedObjects.registerType({
      type: EntityDiscoveryApiKeyType.name,
      attributesToEncrypt: new Set(['apiKey']),
      attributesToIncludeInAAD: new Set(['id', 'name']),
    });

    const assetClient = new AssetClient({
      sourceIndices: this.config.sourceIndices,
      getApmIndices: plugins.apmDataAccess.getApmIndices,
      metricsClient: plugins.metricsDataAccess.client,
    });

    const router = core.http.createRouter();

    this.server = {
      config: this.config,
      logger: this.logger,
    } as AssetManagerServerSetup;

    setupRoutes<RequestHandlerContext>({
      router,
      assetClient,
      logger: this.logger,
      spaces: plugins.spaces,
      server: this.server,
    });

    return {
      assetClient,
    };
  }

  public start(core: CoreStart, plugins: AssetManagerPluginStartDependencies) {
    // Check for config value and bail out if not "alpha-enabled"
    if (!this.config.alphaEnabled) {
      return;
    }

    if (this.server) {
      this.server.core = core;
      this.server.isServerless = core.elasticsearch.getCapabilities().serverless;
      this.server.security = plugins.security;
      this.server.encryptedSavedObjects = plugins.encryptedSavedObjects;
    }

    const esClient = core.elasticsearch.client.asInternalUser;
    upsertTemplate({
      esClient,
      template: assetsIndexTemplateConfig,
      logger: this.logger,
    }).catch(() => {}); // it shouldn't reject, but just in case

    // Install entities compoent templates and index template
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
