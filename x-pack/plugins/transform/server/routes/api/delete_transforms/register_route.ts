/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  deleteTransformsRequestSchema,
  type DeleteTransformsRequestSchema,
} from '../../../../common/api_schemas/delete_transforms';
import { addInternalBasePath } from '../../../../common/constants';

import type { RouteDependencies } from '../../../types';

import { routeHandlerFactory } from './route_handler_factory';

export function registerRoute(routeDependencies: RouteDependencies) {
  const { router, license } = routeDependencies;
  /**
   * @apiGroup Transforms
   *
   * @api {post} /internal/transform/delete_transforms Post delete transforms
   * @apiName DeleteTransforms
   * @apiDescription Deletes transforms
   *
   * @apiSchema (body) deleteTransformsRequestSchema
   */
  router.versioned
    .post({
      path: addInternalBasePath('delete_transforms'),
      access: 'internal',
    })
    .addVersion<undefined, undefined, DeleteTransformsRequestSchema>(
      {
        version: '1',
        validate: {
          request: {
            body: deleteTransformsRequestSchema,
          },
        },
      },
      license.guardApiRoute<undefined, undefined, DeleteTransformsRequestSchema>(
        routeHandlerFactory(routeDependencies)
      )
    );
}
