/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getJsonSchemaQuerySchema } from '../../common/api_schemas/json_schema_schema';
import { wrapError } from '../client/error_wrapper';
import { RouteInitialization } from '../types';
import { JsonSchemaService } from '../models/json_schema_service';

export function jsonSchemaRoutes({ router, routeGuard }: RouteInitialization) {
  /**
   * @apiGroup JsonSchema
   *
   * @api {get} /api/ml/json_schema Get requested JSON schema
   * @apiName GetJsonSchema
   * @apiDescription Retrieves the JSON schema
   */
  router.get(
    {
      path: '/api/ml/json_schema',
      validate: {
        query: getJsonSchemaQuerySchema,
      },
      options: {
        tags: ['access:ml:canAccessML'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ request, response }) => {
      try {
        const jsonSchemaService = new JsonSchemaService();

        const result = await jsonSchemaService.extractSchema(
          request.query.path,
          request.query.method
        );

        return response.ok({
          body: result,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
