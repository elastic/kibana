/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../src/core/server';
import {
  eqlValidationSchema,
  EqlValidationSchemaDecoded,
} from '../../../../../common/detection_engine/schemas/request/eql_validation_schema';
import { DETECTION_ENGINE_EQL_VALIDATION_URL } from '../../../../../common/constants';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { transformError, buildSiemResponse } from '../utils';
import { validateEql } from './helpers';

export const eqlValidationRoute = (router: IRouter) => {
  router.post(
    {
      path: DETECTION_ENGINE_EQL_VALIDATION_URL,
      validate: {
        body: buildRouteValidation<typeof eqlValidationSchema, EqlValidationSchemaDecoded>(
          eqlValidationSchema
        ),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const { query, index } = request.body;
      const esClient = context.core.elasticsearch.client.asCurrentUser;

      try {
        const validation = await validateEql({
          client: esClient,
          query,
          index,
        });

        return response.ok({
          body: { isValid: validation.isValid, errors: validation.errors },
        });
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
