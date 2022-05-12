/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { wrapError } from '../client/error_wrapper';
import { RouteInitialization } from '../types';
import { indicesSchema } from './schemas/indices_schema';

/**
 * Indices routes.
 */
export function indicesRoutes({ router, routeGuard }: RouteInitialization) {
  /**
   * @apiGroup Indices
   *
   * @api {post} /api/ml/indices/field_caps Field caps
   * @apiName FieldCaps
   * @apiDescription Retrieves the capabilities of fields among multiple indices.
   *
   * @apiSchema (body) indicesSchema
   */
  router.post(
    {
      path: '/api/ml/indices/field_caps',
      validate: {
        body: indicesSchema,
      },
      options: {
        tags: ['access:ml:canAccessML'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, request, response }) => {
      try {
        const {
          body: { index, fields: requestFields },
        } = request;
        const fields =
          requestFields !== undefined && Array.isArray(requestFields)
            ? requestFields.join(',')
            : '*';
        const body = await client.asCurrentUser.fieldCaps({ index, fields });
        return response.ok({ body });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
