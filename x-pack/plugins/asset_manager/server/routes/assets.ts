/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RequestHandlerContext } from '@kbn/core/server';
import { debug } from '../../common/debug_log';
import { AssetFilters } from '../../common/types_api';
import { ASSET_MANAGER_API_BASE } from '../constants';
import { getAssets } from '../lib/get_assets';
import { SetupRouteOptions } from './types';
import { getEsClientFromContext } from './utils';

export type GetAssetsQueryOptions = AssetFilters & {
  size?: number;
};

export function assetsRoutes<T extends RequestHandlerContext>({ router }: SetupRouteOptions<T>) {
  // GET assets
  router.get<unknown, GetAssetsQueryOptions | undefined, unknown>(
    {
      path: `${ASSET_MANAGER_API_BASE}/assets`,
      validate: {
        query: schema.any({}),
      },
    },
    async (context, req, res) => {
      const { size, ...filters } = req.query || {};
      const esClient = await getEsClientFromContext(context);

      try {
        const results = await getAssets({ esClient, size, filters });
        return res.ok({ body: { results } });
      } catch (error: unknown) {
        debug('error looking up asset records', error);
        return res.customError({ statusCode: 500 });
      }
    }
  );
}
