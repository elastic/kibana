/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  getLogEntryExamplesRequestPayloadRT,
  getLogEntryExamplesSuccessReponsePayloadRT,
  LOG_ANALYSIS_GET_LOG_ENTRY_RATE_EXAMPLES_PATH,
} from '../../../../common/http_api/log_analysis';
import { createValidationFunction } from '../../../../common/runtime_types';
import { InfraBackendLibs } from '../../../lib/infra_types';
import { getLogEntryExamples } from '../../../lib/log_analysis';
import { isMlPrivilegesError } from '../../../lib/log_analysis/errors';
import { assertHasInfraMlPlugins } from '../../../utils/request_context';

export const initGetLogEntryExamplesRoute = ({
  framework,
  getStartServices,
}: Pick<InfraBackendLibs, 'framework' | 'getStartServices'>) => {
  framework.registerRoute(
    {
      method: 'post',
      path: LOG_ANALYSIS_GET_LOG_ENTRY_RATE_EXAMPLES_PATH,
      validate: {
        body: createValidationFunction(getLogEntryExamplesRequestPayloadRT),
      },
    },
    framework.router.handleLegacyErrors(async (requestContext, request, response) => {
      const {
        data: {
          dataset,
          exampleCount,
          sourceId,
          timeRange: { startTime, endTime },
          categoryId,
        },
      } = request.body;

      const [, , { logViews }] = await getStartServices();
      const resolvedLogView = await logViews.getScopedClient(request).getResolvedLogView(sourceId);

      try {
        assertHasInfraMlPlugins(requestContext);

        const { data: logEntryExamples, timing } = await getLogEntryExamples(
          requestContext,
          sourceId,
          startTime,
          endTime,
          dataset,
          exampleCount,
          resolvedLogView,
          framework.callWithRequest,
          categoryId
        );

        return response.ok({
          body: getLogEntryExamplesSuccessReponsePayloadRT.encode({
            data: {
              examples: logEntryExamples,
            },
            timing,
          }),
        });
      } catch (error) {
        if (Boom.isBoom(error)) {
          throw error;
        }

        if (isMlPrivilegesError(error)) {
          return response.customError({
            statusCode: 403,
            body: {
              message: error.message,
            },
          });
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
