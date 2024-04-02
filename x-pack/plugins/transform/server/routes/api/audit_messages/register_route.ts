/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addInternalBasePath } from '../../../../common/constants';
import type { TransformIdParamSchema } from '../../../../common/api_schemas/common';
import { transformIdParamSchema } from '../../../../common/api_schemas/common';
import {
  getTransformAuditMessagesQuerySchema,
  type GetTransformAuditMessagesQuerySchema,
} from '../../../../common/api_schemas/audit_messages';

import type { RouteDependencies } from '../../../types';

import { routeHandler } from './route_handler';

export function registerRoute({ router, license }: RouteDependencies) {
  /**
   * @apiGroup Transforms Audit Messages
   *
   * @api {get} /internal/transform/transforms/:transformId/messages Transforms Messages
   * @apiName GetTransformsMessages
   * @apiDescription Get transforms audit messages
   *
   * @apiSchema (params) transformIdParamSchema
   */
  router.versioned
    .get({
      path: addInternalBasePath('transforms/{transformId}/messages'),
      access: 'internal',
    })
    .addVersion<TransformIdParamSchema, GetTransformAuditMessagesQuerySchema, undefined>(
      {
        version: '1',
        validate: {
          request: {
            params: transformIdParamSchema,
            query: getTransformAuditMessagesQuerySchema,
          },
        },
      },
      license.guardApiRoute<
        TransformIdParamSchema,
        GetTransformAuditMessagesQuerySchema,
        undefined
      >(routeHandler)
    );
}
