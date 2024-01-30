/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addInternalBasePath } from '../../../../common/constants';
import {
  transformIdParamSchema,
  type TransformIdParamSchema,
} from '../../../../common/api_schemas/common';

import type { RouteDependencies } from '../../../types';

import { routeHandler } from './route_handler';

export function registerRoute({ router, license }: RouteDependencies) {
  /**
   * @apiGroup Transforms
   *
   * @api {get} /internal/transform/transforms/:transformId Get transform
   * @apiName GetTransform
   * @apiDescription Returns a single transform
   *
   * @apiSchema (params) transformIdParamSchema
   */
  router.versioned
    .get({
      path: addInternalBasePath('transforms/{transformId}'),
      access: 'internal',
    })
    .addVersion<TransformIdParamSchema, undefined, undefined>(
      {
        version: '1',
        validate: {
          request: {
            params: transformIdParamSchema,
          },
        },
      },
      license.guardApiRoute<TransformIdParamSchema, undefined, undefined>(routeHandler)
    );
}
