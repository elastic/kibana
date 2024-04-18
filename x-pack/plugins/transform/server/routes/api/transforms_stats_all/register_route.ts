/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import {
  getTransformStatsQuerySchema,
  type GetTransformStatsQuerySchema,
} from '../../../../common/api_schemas/transforms_stats';
import { addInternalBasePath } from '../../../../common/constants';

import type { RouteDependencies } from '../../../types';

import { routeHandler } from './route_handler';

export function registerRoute({ router, license }: RouteDependencies) {
  /**
   * @apiGroup Transforms
   *
   * @api {get} /internal/transform/transforms/_stats Get transforms stats
   * @apiName GetTransformsStats
   * @apiDescription Returns transforms stats
   */
  router.versioned
    .get({
      path: addInternalBasePath('transforms/_stats'),
      access: 'internal',
    })
    .addVersion<
      estypes.TransformGetTransformStatsResponse,
      GetTransformStatsQuerySchema,
      undefined
    >(
      {
        version: '1',
        validate: {
          request: {
            query: getTransformStatsQuerySchema,
          },
        },
      },
      license.guardApiRoute<
        estypes.TransformGetTransformStatsResponse,
        GetTransformStatsQuerySchema,
        undefined
      >(routeHandler)
    );
}
