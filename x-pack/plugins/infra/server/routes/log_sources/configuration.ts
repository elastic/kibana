/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  getLogSourceConfigurationRequestParamsRT,
  getLogSourceConfigurationSuccessResponsePayloadRT,
  LOG_SOURCE_CONFIGURATION_PATH,
  patchLogSourceConfigurationRequestBodyRT,
  patchLogSourceConfigurationRequestParamsRT,
  patchLogSourceConfigurationSuccessResponsePayloadRT,
} from '../../../common/http_api/log_sources';
import { createValidationFunction } from '../../../common/runtime_types';
import { InfraBackendLibs } from '../../lib/infra_types';

export const initLogSourceConfigurationRoutes = ({ framework, sources }: InfraBackendLibs) => {
  framework.registerRoute(
    {
      method: 'get',
      path: LOG_SOURCE_CONFIGURATION_PATH,
      validate: {
        params: createValidationFunction(getLogSourceConfigurationRequestParamsRT),
      },
    },
    framework.router.handleLegacyErrors(async (requestContext, request, response) => {
      const { sourceId } = request.params;

      try {
        const sourceConfiguration = await sources.getSourceConfiguration(
          requestContext.core.savedObjects.client,
          sourceId
        );

        return response.ok({
          body: getLogSourceConfigurationSuccessResponsePayloadRT.encode({
            data: sourceConfiguration,
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

  framework.registerRoute(
    {
      method: 'patch',
      path: LOG_SOURCE_CONFIGURATION_PATH,
      validate: {
        params: createValidationFunction(patchLogSourceConfigurationRequestParamsRT),
        body: createValidationFunction(patchLogSourceConfigurationRequestBodyRT),
      },
    },
    framework.router.handleLegacyErrors(async (requestContext, request, response) => {
      const { sourceId } = request.params;
      const { data: patchedSourceConfigurationProperties } = request.body;

      try {
        const sourceConfiguration = await sources.getSourceConfiguration(
          requestContext.core.savedObjects.client,
          sourceId
        );

        if (sourceConfiguration.origin === 'internal') {
          response.conflict({
            body: 'A conflicting read-only source configuration already exists.',
          });
        }

        const sourceConfigurationExists = sourceConfiguration.origin === 'stored';
        const patchedSourceConfiguration = await (sourceConfigurationExists
          ? sources.updateSourceConfiguration(
              requestContext.core.savedObjects.client,
              sourceId,
              // @ts-ignore
              patchedSourceConfigurationProperties
            )
          : sources.createSourceConfiguration(
              requestContext.core.savedObjects.client,
              sourceId,
              // @ts-ignore
              patchedSourceConfigurationProperties
            ));

        return response.ok({
          body: patchLogSourceConfigurationSuccessResponsePayloadRT.encode({
            data: patchedSourceConfiguration,
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
