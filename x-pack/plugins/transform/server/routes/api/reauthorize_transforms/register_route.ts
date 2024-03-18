/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartTransformsRequestSchema } from '../../../../common/api_schemas/start_transforms';
import { reauthorizeTransformsRequestSchema } from '../../../../common/api_schemas/reauthorize_transforms';
import { addInternalBasePath } from '../../../../common/constants';

import type { RouteDependencies } from '../../../types';

import { routeHandlerFactory } from './route_handler_factory';

export function registerRoute(routeDependencies: RouteDependencies) {
  const { router, license } = routeDependencies;
  /**
   * @apiGroup Reauthorize transforms with API key generated from currently logged in user
   * @api {post} /internal/transform/reauthorize_transforms Post reauthorize transforms
   * @apiName Reauthorize Transforms
   * @apiDescription Reauthorize transforms by generating an API Key for current user
   * and update transform's es-secondary-authorization headers with the generated key,
   * then start the transform.
   * @apiSchema (body) reauthorizeTransformsRequestSchema
   */
  router.versioned
    .post({
      path: addInternalBasePath('reauthorize_transforms'),
      access: 'internal',
    })
    .addVersion<undefined, undefined, StartTransformsRequestSchema>(
      {
        version: '1',
        validate: {
          request: {
            body: reauthorizeTransformsRequestSchema,
          },
        },
      },
      license.guardApiRoute<undefined, undefined, StartTransformsRequestSchema>(
        routeHandlerFactory(routeDependencies)
      )
    );
}
