/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import datemath from '@kbn/datemath';
import {
  dateRt,
  inRangeFromStringRt,
  datemathStringRt,
  createRouteValidationFunction,
  createLiteralValueFromUndefinedRT,
} from '@kbn/io-ts-utils';
import { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { debug } from '../../../common/debug_log';
import { SetupRouteOptions } from '../types';
import { ASSET_MANAGER_API_BASE } from '../../constants';
import { getEsClientFromContext } from '../utils';

const sizeRT = rt.union([inRangeFromStringRt(1, 100), createLiteralValueFromUndefinedRT(10)]);
const assetDateRT = rt.union([dateRt, datemathStringRt]);
const getServiceAssetsQueryOptionsRT = rt.exact(
  rt.partial({
    from: assetDateRT,
    to: assetDateRT,
    size: sizeRT,
    parent: rt.string,
  })
);

export type GetServiceAssetsQueryOptions = rt.TypeOf<typeof getServiceAssetsQueryOptionsRT>;

export function servicesRoutes<T extends RequestHandlerContext>({
  router,
  assetAccessor,
}: SetupRouteOptions<T>) {
  // GET /assets/services
  router.get<unknown, GetServiceAssetsQueryOptions, unknown>(
    {
      path: `${ASSET_MANAGER_API_BASE}/assets/services`,
      validate: {
        query: createRouteValidationFunction(getServiceAssetsQueryOptionsRT),
      },
    },
    async (context, req, res) => {
      const { from = 'now-24h', to = 'now', parent } = req.query || {};
      const esClient = await getEsClientFromContext(context);

      try {
        const response = await assetAccessor.getServices({
          from: datemath.parse(from)!.toISOString(),
          to: datemath.parse(to)!.toISOString(),
          parent,
          esClient,
        });

        return res.ok({ body: response });
      } catch (error: unknown) {
        debug('Error while looking up SERVICE asset records', error);
        return res.customError({
          statusCode: 500,
          body: { message: 'Error while looking up service asset records - ' + `${error}` },
        });
      }
    }
  );
}
