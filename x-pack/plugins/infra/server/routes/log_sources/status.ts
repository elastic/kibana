/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import {
  getLogSourceStatusRequestParamsRT,
  getLogSourceStatusSuccessResponsePayloadRT,
  LOG_SOURCE_STATUS_PATH,
} from '../../../common/http_api/log_sources';
import { createValidationFunction } from '../../../common/runtime_types';
import { InfraIndexType } from '../../graphql/types';
import { InfraBackendLibs } from '../../lib/infra_types';

export const initLogSourceStatusRoutes = ({
  framework,
  sourceStatus,
  fields,
}: InfraBackendLibs) => {
  framework.registerRoute(
    {
      method: 'get',
      path: LOG_SOURCE_STATUS_PATH,
      validate: {
        params: createValidationFunction(getLogSourceStatusRequestParamsRT),
      },
    },
    framework.router.handleLegacyErrors(async (requestContext, request, response) => {
      const { sourceId } = request.params;

      try {
        const logIndicesExist = await sourceStatus.hasLogIndices(requestContext, sourceId);
        const logIndexFields = logIndicesExist
          ? await fields.getFields(requestContext, sourceId, InfraIndexType.LOGS)
          : [];

        return response.ok({
          body: getLogSourceStatusSuccessResponsePayloadRT.encode({
            data: {
              logIndicesExist,
              logIndexFields,
            },
          }),
        });
      } catch (error) {
        if (Boom.isBoom(error)) {
          throw error;
        }

        return response.customError({
          statusCode: error.statusCode ?? 500,
          body: {
            message: error.message ?? 'An unexpected error occurred',
          },
        });
      }
    })
  );
};
