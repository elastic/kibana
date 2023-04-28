/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RequestHandlerContext } from '@kbn/core/server';
import { differenceBy, intersectionBy } from 'lodash';
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

  // GET /assets/diff
  const getAssetsDiffQueryOptions = schema.object({
    aFrom: schema.string(),
    aTo: schema.string(),
    bFrom: schema.string(),
    bTo: schema.string(),
    type: schema.maybe(schema.oneOf([schema.arrayOf(assetType), assetType])),
  });
  router.get<unknown, typeof getAssetsDiffQueryOptions.type, unknown>(
    {
      path: `${ASSET_MANAGER_API_BASE}/assets/diff`,
      validate: {
        query: getAssetsDiffQueryOptions,
      },
    },
    async (context, req, res) => {
      const { aFrom, aTo, bFrom, bTo, type } = req.query;

      if (new Date(aFrom) > new Date(aTo)) {
        return res.badRequest({
          body: `Time range cannot move backwards in time. "aTo" (${aTo}) is before "aFrom" (${aFrom}).`,
        });
      }

      if (new Date(bFrom) > new Date(bTo)) {
        return res.badRequest({
          body: `Time range cannot move backwards in time. "bTo" (${bTo}) is before "bFrom" (${bFrom}).`,
        });
      }

      const esClient = await getEsClientFromContext(context);

      try {
        const resultsForA = await getAssets({
          esClient,
          filters: {
            from: aFrom,
            to: aTo,
            type,
          },
        });

        const resultsForB = await getAssets({
          esClient,
          filters: {
            from: bFrom,
            to: bTo,
            type,
          },
        });

        const onlyInA = differenceBy(resultsForA, resultsForB, 'asset.ean');
        const onlyInB = differenceBy(resultsForB, resultsForA, 'asset.ean');
        const inBoth = intersectionBy(resultsForA, resultsForB, 'asset.ean');

        return res.ok({
          body: {
            onlyInA,
            onlyInB,
            inBoth,
          },
        });
      } catch (error: unknown) {
        debug('error looking up asset records', error);
        return res.customError({ statusCode: 500 });
      }
    }
  );
}
