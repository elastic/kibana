/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  getLogSourceStatusRequestParamsRT,
  getLogSourceStatusSuccessResponsePayloadRT,
  LOG_SOURCE_STATUS_PATH,
} from '../../../common/http_api/log_sources';
import { createValidationFunction } from '../../../common/runtime_types';
import { InfraBackendLibs } from '../../lib/infra_types';
import { resolveLogSourceConfiguration } from '../../../common/log_sources';

export const initLogSourceStatusRoutes = ({
  framework,
  sourceStatus,
  fields,
  sources,
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
        const sourceConfiguration = await sources.getSourceConfiguration(
          requestContext.core.savedObjects.client,
          sourceId
        );

        const resolvedLogSourceConfiguration = await resolveLogSourceConfiguration(
          sourceConfiguration.configuration,
          await framework.getIndexPatternsServiceWithRequestContext(requestContext)
        );

        const logIndexStatus = await sourceStatus.getLogIndexStatus(
          requestContext,
          resolvedLogSourceConfiguration
        );

        return response.ok({
          body: getLogSourceStatusSuccessResponsePayloadRT.encode({
            data: {
              logIndexStatus,
              indices: resolvedLogSourceConfiguration.indices,
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
