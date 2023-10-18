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

import { upsertTemplate } from './lib/manage_index_templates';
import { setupRoutes } from './routes';
import { assetsIndexTemplateConfig } from './templates/assets_template';
import { AssetClient } from './lib/asset_client';
import { AssetManagerPluginSetupDependencies, AssetManagerPluginStartDependencies } from './types';
import { AssetManagerConfig, configSchema, exposeToBrowserConfig } from '../common/config';

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

    const assetClient = new AssetClient({
      sourceIndices: this.config.sourceIndices,
      getApmIndices: plugins.apmDataAccess.getApmIndices,
      metricsClient: plugins.metricsDataAccess.client,
    });

    const router = core.http.createRouter();
    setupRoutes<RequestHandlerContext>({ router, assetClient });

    return {
      assetClient,
    };
  }

  public start(core: CoreStart) {
    // Check for config value and bail out if not "alpha-enabled"
    if (!this.config.alphaEnabled) {
      return;
    }

    upsertTemplate({
      esClient: core.elasticsearch.client.asInternalUser,
      template: assetsIndexTemplateConfig,
      logger: this.logger,
    });

    return {};
  }

  public stop() {}
}
