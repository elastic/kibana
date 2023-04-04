/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RequestHandlerContext } from '@kbn/core/server';
import { debug } from '../../common/debug_log';
import { ASSET_MANAGER_API_BASE } from '../constants';
import { getAssets } from '../lib/get_assets';
import { SetupRouteOptions } from './types';
import { getEsClientFromContext } from './utils';

const assetType = schema.oneOf([
  schema.literal('k8s.pod'),
  schema.literal('k8s.cluster'),
  schema.literal('k8s.node'),
]);

const getAssetsQueryOptions = schema.object({
  from: schema.maybe(schema.string()),
  to: schema.maybe(schema.string()),
  type: schema.maybe(schema.oneOf([schema.arrayOf(assetType), assetType])),
  ean: schema.maybe(schema.oneOf([schema.arrayOf(schema.string()), schema.string()])),
  size: schema.maybe(schema.number()),
});

export function assetsRoutes<T extends RequestHandlerContext>({ router }: SetupRouteOptions<T>) {
  // GET /assets
  router.get<unknown, typeof getAssetsQueryOptions.type, unknown>(
    {
      path: `${ASSET_MANAGER_API_BASE}/assets`,
      validate: {
        query: getAssetsQueryOptions,
      },
    },
    async (context, req, res) => {
      const { size, ...filters } = req.query || {};

      if (filters.type && filters.ean) {
        return res.badRequest({
          body: 'Filters "type" and "ean" are mutually exclusive but found both.',
        });
      }

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
