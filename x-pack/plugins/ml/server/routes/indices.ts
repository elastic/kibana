/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_INTERNAL_BASE_PATH } from '../../common/constants/app';
import { wrapError } from '../client/error_wrapper';
import type { RouteInitialization } from '../types';
import { indicesSchema } from './schemas/indices_schema';

/**
 * Indices routes.
 */
export function indicesRoutes({ router, routeGuard }: RouteInitialization) {
  /**
   * @apiGroup Indices
   *
   * @api {post} /internal/ml/indices/field_caps Field caps
   * @apiName FieldCaps
   * @apiDescription Retrieves the capabilities of fields among multiple indices.
   *
   * @apiSchema (body) indicesSchema
   */
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/indices/field_caps`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetFieldInfo'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: indicesSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, request, response }) => {
        try {
          const {
            body: { index, fields: requestFields },
          } = request;
          const fields =
            requestFields !== undefined && Array.isArray(requestFields) ? requestFields : '*';
          const body = await client.asCurrentUser.fieldCaps({ index, fields }, { maxRetries: 0 });
          return response.ok({ body });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );
}
