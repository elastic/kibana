/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getIndexFieldsRequestParamsRT,
  getIndexFieldsResponsePayloadRT,
} from '../../../common/http_api/index_fields';
import { createValidationFunction } from '../../../common/runtime_types';
import type { KibanaFramework } from '../../lib/adapters/framework/kibana_framework_adapter';
import { InfraFieldsDomain } from '../../lib/domains/fields_domain';

export const initGetIndexFieldsRoute = ({
  framework,
  fields,
}: {
  framework: KibanaFramework;
  fields: InfraFieldsDomain;
}) => {
  framework.registerRoute(
    {
      method: 'get',
      path: '/api/infra/index_fields',
      validate: {
        query: createValidationFunction(getIndexFieldsRequestParamsRT),
      },
    },
    async (requestContext, request, response) => {
      const { indexPattern } = request.query;

      try {
        const data = await fields.getFields(requestContext, indexPattern);

        return response.ok({
          body: getIndexFieldsResponsePayloadRT.encode({
            data,
          }),
        });
      } catch (error) {
        return response.customError({
          statusCode: error.statusCode ?? 500,
          body: {
            message: error.message ?? 'An unexpected error occurred',
          },
        });
      }
    }
  );
};
