/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RequestHandlerContext } from '@kbn/core/server';
import { debug } from '../../common/debug_log';
import { AssetFilters, AssetType, assetType } from '../../common/types_api';
import { ASSET_MANAGER_API_BASE } from '../constants';
import { getAssets } from '../lib/get_assets';
import { getAllRelatedAssets } from '../lib/get_all_related_assets';
import { SetupRouteOptions } from './types';
import { getEsClientFromContext } from './utils';

export type GetAssetsQueryOptions = AssetFilters & {
  size?: number;
};

const getAssetsAncestorsQueryOptions = schema.object({
  from: schema.string(), // ISO timestamp or ES datemath
  to: schema.maybe(schema.string()), // ISO timestamp or ES datemath
  ean: schema.string(),
  type: schema.maybe(schema.oneOf([assetType, schema.arrayOf(assetType)])),
  maxDistance: schema.maybe(schema.number()),
  size: schema.maybe(schema.number()),
});
type GetAssetsAncestorsQueryOptions = typeof getAssetsAncestorsQueryOptions.type;

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

  // GET assets/ancestors
  router.get<unknown, GetAssetsAncestorsQueryOptions, unknown>(
    {
      path: `${ASSET_MANAGER_API_BASE}/assets/ancestors`,
      validate: {
        query: getAssetsAncestorsQueryOptions,
      },
    },
    async (context, req, res) => {
      const { from, to, ean } = req.query || {};
      const esClient = await getEsClientFromContext(context);

      const maxDistance = req.query.maxDistance ? Math.min(req.query.maxDistance, 5) : 1; // Validate maxDistance not larger than 5
      const size = req.query.size ? Math.min(req.query.size, 100) : 10; // Do we need pagination and sorting? Yes.
      const type = validateTypeParameter(req.query.type);
      // Validate from and to to be ISO string only. Or use io-ts to coerce.

      try {
        return res.ok({
          body: {
            results: getAllRelatedAssets(esClient, { ean, from, to, type, maxDistance, size }),
          },
        });
      } catch (error: unknown) {
        debug('error looking up asset records', error);
        return res.customError({ statusCode: 500, body: 'Gello' });
      }
    }
  );
}

function validateTypeParameter(type?: AssetType | AssetType[]) {
  if (!type) {
    return undefined;
  }

  if (Array.isArray(type)) {
    if (type.length !== 0) {
      return type;
    }

    return undefined;
  }

  return [type];
}
