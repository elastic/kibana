/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PostTransformsPreviewRequestSchema } from '../../../../common/api_schemas/transforms';
import { postTransformsPreviewRequestSchema } from '../../../../common/api_schemas/transforms';
import { addInternalBasePath } from '../../../../common/constants';

import type { RouteDependencies } from '../../../types';

import { routeHandler } from './route_handler';

export function registerRoute({ router, license }: RouteDependencies) {
  /**
   * @apiGroup Transforms
   *
   * @api {post} /internal/transform/transforms/_preview Preview transform
   * @apiName PreviewTransform
   * @apiDescription Previews transform
   *
   * @apiSchema (body) postTransformsPreviewRequestSchema
   */
  router.versioned
    .post({
      path: addInternalBasePath('transforms/_preview'),
      access: 'internal',
    })
    .addVersion<undefined, undefined, PostTransformsPreviewRequestSchema>(
      {
        version: '1',
        validate: {
          request: {
            body: postTransformsPreviewRequestSchema,
          },
        },
      },
      license.guardApiRoute<undefined, undefined, PostTransformsPreviewRequestSchema>(routeHandler)
    );
}
