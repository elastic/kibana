/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup } from '@kbn/core/server';
import { getAssets } from './lib/get_assets';

export type AssetInventoryServerPluginSetup = ReturnType<AssetInventoryServerPlugin['setup']>;

export class AssetInventoryServerPlugin implements Plugin<AssetInventoryServerPluginSetup> {
  public async setup(core: CoreSetup) {
    const router = core.http.createRouter();

    router.get(
      {
        path: '/api/asset-inventory/ping',
        validate: false,
      },
      (context, req, res) => {
        return res.ok({
          body: { message: 'Asset Inventory OK' },
          headers: { 'content-type': 'application/json' },
        });
      }
    );

    router.get(
      {
        path: '/api/asset-inventory',
        validate: false,
      },
      async (context, req, res) => {
        try {
          const assets = await getAssets();
          return res.ok({ body: { assets } });
        } catch (error: unknown) {
          return res.customError({ statusCode: 500 });
        }
      }
    );

    return {};
  }

  public start() {}

  public stop() {}
}
