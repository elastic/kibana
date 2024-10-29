/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  stopTransformsRequestSchema,
  type StopTransformsRequestSchema,
} from '../../api_schemas/stop_transforms';
import { addInternalBasePath } from '../../../../common/constants';

import type { RouteDependencies } from '../../../types';

import { routeHandler } from './route_handler';

export function registerRoute({ router, getLicense }: RouteDependencies) {
  /**
   * @apiGroup Transforms
   *
   * @api {post} /internal/transform/stop_transforms Stop transforms
   * @apiName PostStopTransforms
   * @apiDescription Stops transform
   *
   * @apiSchema (body) stopTransformsRequestSchema
   */
  router.versioned
    .post({
      path: addInternalBasePath('stop_transforms'),
      access: 'internal',
    })
    .addVersion<undefined, undefined, StopTransformsRequestSchema>(
      {
        version: '1',
        validate: {
          request: {
            body: stopTransformsRequestSchema,
          },
        },
      },
      async (ctx, request, response) => {
        const license = await getLicense();
        return license.guardApiRoute<undefined, undefined, StopTransformsRequestSchema>(
          routeHandler
        )(ctx, request, response);
      }
    );
}
