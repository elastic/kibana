/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import {
  config as ElasticsearchBaseConfig,
  Plugin,
  CoreSetup,
  RequestHandlerContext,
  CoreStart,
  PluginInitializerContext,
  PluginConfigDescriptor,
  Logger,
} from '@kbn/core/server';

import { upsertTemplate } from './lib/manage_index_templates';
import { runImplicitCollection } from './lib/implicit_collection';
import { setupRoutes } from './routes';
import { assetsIndexTemplateConfig } from './templates/assets_template';

export type AssetManagerServerPluginSetup = ReturnType<AssetManagerServerPlugin['setup']>;

const configSchema = schema.object({
  alphaEnabled: schema.maybe(schema.boolean()),
  implicitCollection: schema.maybe(
    schema.object({
      enabled: schema.maybe(schema.boolean({ defaultValue: true })),
      interval: schema.duration({ defaultValue: '5m' }),
      input: ElasticsearchBaseConfig.elasticsearch.schema,
    })
  ),
});

export type AssetManagerConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<AssetManagerConfig> = {
  schema: configSchema,
};

export class AssetManagerServerPlugin implements Plugin<AssetManagerServerPluginSetup> {
  private context: PluginInitializerContext<AssetManagerConfig>;
  public config: AssetManagerConfig;
  public logger: Logger;

  constructor(context: PluginInitializerContext<AssetManagerConfig>) {
    this.context = context;
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

    if (this.config.implicitCollection?.enabled) {
      this.logger.info(
        `Implicit collection set to run every ${this.config.implicitCollection.interval}`
      );

      runImplicitCollection({
        intervalMs: this.config.implicitCollection.interval.asMilliseconds(),
        logger: this.context.logger.get('implicit_collection'),
      });
    }

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
