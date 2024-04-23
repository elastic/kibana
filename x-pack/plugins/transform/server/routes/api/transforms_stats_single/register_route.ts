/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  transformIdParamSchema,
  type TransformIdParamSchema,
} from '../../../../common/api_schemas/common';
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
   * @api {get} /internal/transform/transforms/:transformId/_stats Get transform stats
   * @apiName GetTransformStats
   * @apiDescription Returns stats for a single transform
   *
   * @apiSchema (params) transformIdParamSchema
   */
  router.versioned
    .get({
      path: addInternalBasePath('transforms/{transformId}/_stats'),
      access: 'internal',
    })
    .addVersion<TransformIdParamSchema, GetTransformStatsQuerySchema, undefined>(
      {
        version: '1',
        validate: {
          request: {
            params: transformIdParamSchema,
            query: getTransformStatsQuerySchema,
          },
        },
      },
      license.guardApiRoute<TransformIdParamSchema, GetTransformStatsQuerySchema, undefined>(
        routeHandler
      )
    );
}
