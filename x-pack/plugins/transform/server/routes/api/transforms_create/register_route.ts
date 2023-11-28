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
  putTransformsRequestSchema,
  putTransformsQuerySchema,
  type PutTransformsRequestSchema,
  type PutTransformsQuerySchema,
} from '../../../../common/api_schemas/transforms';
import { addInternalBasePath } from '../../../../common/constants';

import type { RouteDependencies } from '../../../types';

import { routeHandlerFactory } from './route_handler_factory';

export function registerRoute(routeDependencies: RouteDependencies) {
  const { router, license } = routeDependencies;

  /**
   * @apiGroup Transforms
   *
   * @api {put} /internal/transform/transforms/:transformId Put transform
   * @apiName PutTransform
   * @apiDescription Creates a transform
   *
   * @apiSchema (params) transformIdParamSchema
   * @apiSchema (query) transformIdParamSchema
   * @apiSchema (body) putTransformsRequestSchema
   */
  router.versioned
    .put({
      path: addInternalBasePath('transforms/{transformId}'),
      access: 'internal',
    })
    .addVersion<TransformIdParamSchema, PutTransformsQuerySchema, PutTransformsRequestSchema>(
      {
        version: '1',
        validate: {
          request: {
            params: transformIdParamSchema,
            query: putTransformsQuerySchema,
            body: putTransformsRequestSchema,
          },
        },
      },
      license.guardApiRoute<
        TransformIdParamSchema,
        PutTransformsQuerySchema,
        PutTransformsRequestSchema
      >(routeHandlerFactory(routeDependencies))
    );
}
