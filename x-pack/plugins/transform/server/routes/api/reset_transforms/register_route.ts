/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  resetTransformsRequestSchema,
  type ResetTransformsRequestSchema,
} from '../../../../common/api_schemas/reset_transforms';
import { addInternalBasePath } from '../../../../common/constants';

import type { RouteDependencies } from '../../../types';

import { routeHandler } from './route_handler';

export function registerRoute({ router, license }: RouteDependencies) {
  /**
   * @apiGroup Transforms
   *
   * @api {post} /internal/transform/reset_transforms Post reset transforms
   * @apiName ResetTransforms
   * @apiDescription resets transforms
   *
   * @apiSchema (body) resetTransformsRequestSchema
   */
  router.versioned
    .post({
      path: addInternalBasePath('reset_transforms'),
      access: 'internal',
    })
    .addVersion<undefined, undefined, ResetTransformsRequestSchema>(
      {
        version: '1',
        validate: {
          request: {
            body: resetTransformsRequestSchema,
          },
        },
      },
      license.guardApiRoute<undefined, undefined, ResetTransformsRequestSchema>(routeHandler)
    );
}
