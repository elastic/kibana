/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  startTransformsRequestSchema,
  type StartTransformsRequestSchema,
} from '../../api_schemas/start_transforms';
import { addInternalBasePath } from '../../../../common/constants';

import type { RouteDependencies } from '../../../types';

import { routeHandler } from './route_handler';

export function registerRoute({ router, getLicense }: RouteDependencies) {
  /**
   * @apiGroup Transforms
   *
   * @api {post} /internal/transform/start_transforms Start transforms
   * @apiName PostStartTransforms
   * @apiDescription Starts transform
   *
   * @apiSchema (body) startTransformsRequestSchema
   */
  router.versioned
    .post({
      path: addInternalBasePath('start_transforms'),
      access: 'internal',
    })
    .addVersion<undefined, undefined, StartTransformsRequestSchema>(
      {
        version: '1',
        validate: {
          request: {
            body: startTransformsRequestSchema,
          },
        },
      },
      async (ctx, request, response) => {
        const license = await getLicense();
        return license.guardApiRoute<undefined, undefined, StartTransformsRequestSchema>(
          routeHandler
        )(ctx, request, response);
      }
    );
}
