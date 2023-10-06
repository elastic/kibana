/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { logAnalysisResultsV1 } from '../../../../common/http_api';

import { createValidationFunction } from '../../../../common/runtime_types';
import { InfraBackendLibs } from '../../../lib/infra_types';
import { getLogEntryExamples } from '../../../lib/log_analysis';
import { isMlPrivilegesError } from '../../../lib/log_analysis/errors';
import { assertHasInfraMlPlugins } from '../../../utils/request_context';

export const initGetLogEntryExamplesRoute = ({
  framework,
  getStartServices,
}: Pick<InfraBackendLibs, 'framework' | 'getStartServices'>) => {
  if (!framework.config.featureFlags.logsUIEnabled) {
    return;
  }
  framework
    .registerVersionedRoute({
      access: 'internal',
      method: 'post',
      path: logAnalysisResultsV1.LOG_ANALYSIS_GET_LOG_ENTRY_RATE_EXAMPLES_PATH,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: createValidationFunction(
              logAnalysisResultsV1.getLogEntryExamplesRequestPayloadRT
            ),
          },
        },
      },
      framework.router.handleLegacyErrors(async (requestContext, request, response) => {
        const {
          data: {
            dataset,
            exampleCount,
            logView,
            idFormat,
            timeRange: { startTime, endTime },
            categoryId,
          },
        } = request.body;

        const [, { logsShared }] = await getStartServices();
        const resolvedLogView = await logsShared.logViews
          .getScopedClient(request)
          .getResolvedLogView(logView);

        try {
          const infraMlContext = await assertHasInfraMlPlugins(requestContext);

          const { data: logEntryExamples, timing } = await getLogEntryExamples(
            infraMlContext,
            logView,
            idFormat,
            startTime,
            endTime,
            dataset,
            exampleCount,
            resolvedLogView,
            framework.callWithRequest,
            categoryId
          );

          return response.ok({
            body: logAnalysisResultsV1.getLogEntryExamplesSuccessResponsePayloadRT.encode({
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
