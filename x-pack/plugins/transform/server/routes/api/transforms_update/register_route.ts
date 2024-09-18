/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformIdParamSchema, type TransformIdParamSchema } from '../../api_schemas/common';
import {
  postTransformsUpdateRequestSchema,
  type PostTransformsUpdateRequestSchema,
} from '../../api_schemas/update_transforms';
import { addInternalBasePath } from '../../../../common/constants';

import type { RouteDependencies } from '../../../types';

import { routeHandler } from './route_handler';

export function registerRoute({ router, getLicense }: RouteDependencies) {
  /**
   * @apiGroup Transforms
   *
   * @api {post} /internal/transform/transforms/:transformId/_update Post transform update
   * @apiName PostTransformUpdate
   * @apiDescription Updates a transform
   *
   * @apiSchema (params) transformIdParamSchema
   * @apiSchema (body) postTransformsUpdateRequestSchema
   */
  router.versioned
    .post({
      path: addInternalBasePath('transforms/{transformId}/_update'),
      access: 'internal',
    })
    .addVersion<TransformIdParamSchema, undefined, PostTransformsUpdateRequestSchema>(
      {
        version: '1',
        validate: {
          request: {
            params: transformIdParamSchema,
            body: postTransformsUpdateRequestSchema,
          },
        },
      },
      async (ctx, request, response) => {
        const license = await getLicense();
        return license.guardApiRoute<
          TransformIdParamSchema,
          undefined,
          PostTransformsUpdateRequestSchema
        >(routeHandler)(ctx, request, response);
      }
    );
}
