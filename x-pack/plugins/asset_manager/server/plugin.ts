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
