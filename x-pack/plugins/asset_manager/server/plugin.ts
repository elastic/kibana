/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { Plugin, CoreSetup, RequestHandlerContext, CoreStart } from '@kbn/core/server';
import { debug } from '../common/debug_log';
import { AssetFilters } from '../common/types_api';
import { ASSET_MANAGER_API_BASE } from './constants';
import { getAssets } from './lib/get_assets';
import { maybeCreateTemplate } from './lib/maybe_create_index_template';
import { getSampleAssetDocs, sampleAssets } from './lib/sample-assets';
import { writeAssets } from './lib/write_assets';
import assetsTemplate from './templates/assets-template.json';

export type AssetManagerServerPluginSetup = ReturnType<AssetManagerServerPlugin['setup']>;

async function getEsClientFromContext(context: RequestHandlerContext) {
  return (await context.core).elasticsearch.client.asCurrentUser;
}

export class AssetManagerServerPlugin implements Plugin<AssetManagerServerPluginSetup> {
  public async setup(core: CoreSetup) {
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

  public async start(core: CoreStart) {
    // create assets-* index template if it doeesn't already exist
    await maybeCreateTemplate({
      esClient: core.elasticsearch.client.asInternalUser,
      template: assetsTemplate,
    });
  }

  public stop() {}
}
