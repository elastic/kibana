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
import { debug } from '../common/debug_log';
import { AssetFilters } from '../common/types_api';
import { ASSET_MANAGER_API_BASE } from './constants';
import { getAssets } from './lib/get_assets';
import { upsertTemplate } from './lib/manage_index_templates';
import { getSampleAssetDocs, sampleAssets } from './lib/sample-assets';
import { writeAssets } from './lib/write_assets';
import { assetsIndexTemplateConfig } from './templates/assets-template';

export type AssetManagerServerPluginSetup = ReturnType<AssetManagerServerPlugin['setup']>;
export interface AssetManagerConfig {
  alphaEnabled?: boolean;
}

export const config: PluginConfigDescriptor<AssetManagerConfig> = {
  schema: schema.object({
    alphaEnabled: schema.maybe(schema.boolean()),
  }),
};

async function getEsClientFromContext(context: RequestHandlerContext) {
  return (await context.core).elasticsearch.client.asCurrentUser;
}

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

    router.get(
      {
        path: `${ASSET_MANAGER_API_BASE}/ping`,
        validate: false,
      },
      async (_context, _req, res) => {
        return res.ok({
          body: { message: 'Asset Manager OK' },
          headers: { 'content-type': 'application/json' },
        });
      }
    );

    router.get<unknown, AssetFilters | undefined, unknown>(
      {
        path: `${ASSET_MANAGER_API_BASE}/assets`,
        validate: {
          query: schema.any({}),
        },
      },
      async (context, req, res) => {
        const filters = req.query || {};
        const esClient = await getEsClientFromContext(context);

        try {
          const results = await getAssets({ esClient, filters });
          return res.ok({ body: { results } });
        } catch (error: unknown) {
          debug('error looking up asset records', error);
          return res.customError({ statusCode: 500 });
        }
      }
    );

    router.get<unknown, unknown, unknown>(
      {
        path: `${ASSET_MANAGER_API_BASE}/assets/sample`,
        validate: {},
      },
      async (context, req, res) => {
        return res.ok({ body: { assets: sampleAssets } });
      }
    );

    type WriteSamplesPostBody = { baseDateTime?: string | number; remove?: string[] } | null;
    router.post<unknown, unknown, WriteSamplesPostBody>(
      {
        path: `${ASSET_MANAGER_API_BASE}/assets/sample`,
        validate: {
          body: schema.nullable(
            schema.object({
              baseDateTime: schema.maybe(
                schema.oneOf<string, number>([schema.string(), schema.number()])
              ),
              remove: schema.maybe(schema.arrayOf(schema.string())),
            })
          ),
        },
      },
      async (context, req, res) => {
        const { baseDateTime, remove } = req.body || {};
        const parsed = baseDateTime === undefined ? undefined : new Date(baseDateTime);
        if (parsed?.toString() === 'Invalid Date') {
          return res.customError({
            statusCode: 400,
            body: {
              message: `${baseDateTime} is not a valid date time value`,
            },
          });
        }
        const esClient = await getEsClientFromContext(context);
        const assetDocs = getSampleAssetDocs({ baseDateTime: parsed, remove });

        const response = await writeAssets({ esClient, assetDocs, namespace: 'sample_data' });

        if (response.errors) {
          return res.customError({
            statusCode: 500,
            body: {
              message: JSON.stringify(response.errors),
            },
          });
        }

        return res.ok({ body: response });
      }
    );

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
