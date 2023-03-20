/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
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

export type AssetManagerServerPluginSetup = ReturnType<AssetManagerServerPlugin['setup']>;
export interface AssetManagerConfig {
  alphaEnabled?: boolean;
}

export const config: PluginConfigDescriptor<AssetManagerConfig> = {
  schema: schema.object({
    alphaEnabled: schema.maybe(schema.boolean()),
  }),
};

export class AssetManagerServerPlugin implements Plugin<AssetManagerServerPluginSetup> {
  public config: AssetManagerConfig;
  public logger: Logger;

  constructor(context: PluginInitializerContext<AssetManagerConfig>) {
    this.config = context.config.get();
    this.logger = context.logger.get();
  }

  public setup(core: CoreSetup) {
    // Check for config value and bail out if not "alpha-enabled"
    if (!this.config.alphaEnabled) {
      this.logger.info('Asset manager plugin [tech preview] is NOT enabled');
      return;
    }

    this.logger.info('Asset manager plugin [tech preview] is enabled');

    const router = core.http.createRouter();
    setupRoutes<RequestHandlerContext>({ router });

    return {};
  }

  public start(core: CoreStart) {
    // Check for config value and bail out if not "alpha-enabled"
    if (!this.config.alphaEnabled) {
      return;
    }

    // create/update assets-* index template
    upsertTemplate({
      esClient: core.elasticsearch.client.asInternalUser,
      template: assetsIndexTemplateConfig,
      logger: this.logger,
    });
  }

  public stop() {}
}
