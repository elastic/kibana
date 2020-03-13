/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getLogSourceConfigurationRequestParamsRT,
  getLogSourceConfigurationSuccessResponsePayloadRT,
  LOG_SOURCE_CONFIGURATION_PATH,
} from '../../../common/http_api/log_sources';
import { createValidationFunction } from '../../../common/runtime_types';
import { InfraBackendLibs } from '../../lib/infra_types';

const validateGetLogSourceConfigurationRequestParams = createValidationFunction(
  getLogSourceConfigurationRequestParamsRT
);

export const initLogSourceConfigurationRoutes = ({ framework, sources }: InfraBackendLibs) => {
  framework.registerRoute(
    {
      method: 'get',
      path: LOG_SOURCE_CONFIGURATION_PATH,
      validate: {
        params: validateGetLogSourceConfigurationRequestParams,
      },
    },
    async (requestContext, request, response) => {
      const { sourceId } = request.params;

      try {
        const sourceConfiguration = await sources.getSourceConfiguration(requestContext, sourceId);

        return response.ok({
          body: getLogSourceConfigurationSuccessResponsePayloadRT.encode({
            data: sourceConfiguration,
          }),
        });
      } catch (e) {
        const { statusCode = 500, message = 'Unknown error occurred' } = e;

        return response.customError({
          statusCode,
          body: { message },
        });
      }
    }
  );
};
