/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { differenceBy, intersectionBy } from 'lodash';
import * as rt from 'io-ts';
import {
  dateRt,
  inRangeFromStringRt,
  datemathStringRt,
  createRouteValidationFunction,
  createLiteralValueFromUndefinedRT,
} from '@kbn/io-ts-utils';
import { debug } from '../../../common/debug_log';
import { assetTypeRT, assetKindRT, relationRT } from '../../../common/types_api';
import { ASSET_MANAGER_API_BASE } from '../../constants';
import { getAssets } from '../../lib/get_assets';
import { getAllRelatedAssets } from '../../lib/get_all_related_assets';
import { SetupRouteOptions } from '../types';
import { getEsClientFromContext } from '../utils';
import { AssetNotFoundError } from '../../lib/errors';
import { isValidRange } from '../../lib/utils';

function maybeArrayRT(t: rt.Mixed) {
  return rt.union([rt.array(t), t]);
}

const sizeRT = rt.union([inRangeFromStringRt(1, 100), createLiteralValueFromUndefinedRT(10)]);
const assetDateRT = rt.union([dateRt, datemathStringRt]);
const getAssetsQueryOptionsRT = rt.exact(
  rt.partial({
    from: assetDateRT,
    to: assetDateRT,
    type: maybeArrayRT(assetTypeRT),
    kind: maybeArrayRT(assetKindRT),
    ean: maybeArrayRT(rt.string),
    size: sizeRT,
  })
);

const getAssetsDiffQueryOptionsRT = rt.exact(
  rt.intersection([
    rt.type({
      aFrom: assetDateRT,
      aTo: assetDateRT,
      bFrom: assetDateRT,
      bTo: assetDateRT,
    }),
    rt.partial({
      type: maybeArrayRT(assetTypeRT),
      kind: maybeArrayRT(assetKindRT),
    }),
  ])
);

const getRelatedAssetsQueryOptionsRT = rt.exact(
  rt.intersection([
    rt.type({
      from: assetDateRT,
      ean: rt.string,
      relation: relationRT,
      size: sizeRT,
      maxDistance: rt.union([inRangeFromStringRt(1, 5), createLiteralValueFromUndefinedRT(1)]),
    }),
    rt.partial({
      to: assetDateRT,
      type: maybeArrayRT(assetTypeRT),
      kind: maybeArrayRT(assetKindRT),
    }),
  ])
);

export type GetAssetsQueryOptions = rt.TypeOf<typeof getAssetsQueryOptionsRT>;
export type GetRelatedAssetsQueryOptions = rt.TypeOf<typeof getRelatedAssetsQueryOptionsRT>;
export type GetAssetsDiffQueryOptions = rt.TypeOf<typeof getAssetsDiffQueryOptionsRT>;

export function assetsRoutes<T extends RequestHandlerContext>({ router }: SetupRouteOptions<T>) {
  // GET /assets
  router.get<unknown, GetAssetsQueryOptions, unknown>(
    {
      path: `${ASSET_MANAGER_API_BASE}/assets`,
      validate: {
        query: createRouteValidationFunction(getAssetsQueryOptionsRT),
      },
    },
    async (context, req, res) => {
      const { size, ...filters } = req.query || {};

      if (filters.type && filters.ean) {
        return res.badRequest({
          body: 'Filters "type" and "ean" are mutually exclusive but found both.',
        });
      }

      if (filters.kind && filters.ean) {
        return res.badRequest({
          body: 'Filters "kind" and "ean" are mutually exclusive but found both.',
        });
      }

      const esClient = await getEsClientFromContext(context);

      try {
        const results = await getAssets({ esClient, size, filters });
        return res.ok({ body: { results } });
      } catch (error: unknown) {
        debug('error looking up asset records', error);
        return res.customError({
          statusCode: 500,
          body: { message: 'Error while looking up asset records - ' + `${error}` },
        });
      }
    }
  );

  // GET assets/related
  router.get<unknown, GetRelatedAssetsQueryOptions, unknown>(
    {
      path: `${ASSET_MANAGER_API_BASE}/assets/related`,
      validate: {
        query: createRouteValidationFunction(getRelatedAssetsQueryOptionsRT),
      },
    },
    async (context, req, res) => {
      // Add references into sample data and write integration tests

      const { from, to, ean, relation, maxDistance, size, type, kind } = req.query || {};
      const esClient = await getEsClientFromContext(context);

      if (to && !isValidRange(from, to)) {
        return res.badRequest({
          body: `Time range cannot move backwards in time. "to" (${to}) is before "from" (${from}).`,
        });
      }

      try {
        return res.ok({
          body: {
            results: await getAllRelatedAssets(esClient, {
              ean,
              from,
              to,
              type,
              kind,
              maxDistance,
              size,
              relation,
            }),
          },
        });
      } catch (error: any) {
        debug('error looking up asset records', error);
        if (error instanceof AssetNotFoundError) {
          return res.customError({ statusCode: 404, body: error.message });
        }
        return res.customError({ statusCode: 500, body: error.message });
      }
    }
  );

  // GET /assets/diff
  router.get<unknown, GetAssetsDiffQueryOptions, unknown>(
    {
      path: `${ASSET_MANAGER_API_BASE}/assets/diff`,
      validate: {
        query: createRouteValidationFunction(getAssetsDiffQueryOptionsRT),
      },
    },
    async (context, req, res) => {
      const { aFrom, aTo, bFrom, bTo, type, kind } = req.query;
      // const type = toArray<AssetType>(req.query.type);
      // const kind = toArray<AssetKind>(req.query.kind);

      if (!isValidRange(aFrom, aTo)) {
        return res.badRequest({
          body: `Time range cannot move backwards in time. "aTo" (${aTo}) is before "aFrom" (${aFrom}).`,
        });
      }

      if (!isValidRange(bFrom, bTo)) {
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
            kind,
          },
        });

        const resultsForB = await getAssets({
          esClient,
          filters: {
            from: bFrom,
            to: bTo,
            type,
            kind,
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
