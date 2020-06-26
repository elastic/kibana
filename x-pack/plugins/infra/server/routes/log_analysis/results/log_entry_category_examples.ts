/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import {
  getLogEntryCategoryExamplesRequestPayloadRT,
  getLogEntryCategoryExamplesSuccessReponsePayloadRT,
  LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORY_EXAMPLES_PATH,
} from '../../../../common/http_api/log_analysis';
import { createValidationFunction } from '../../../../common/runtime_types';
import type { InfraBackendLibs } from '../../../lib/infra_types';
import {
  getLogEntryCategoryExamples,
  NoLogAnalysisResultsIndexError,
} from '../../../lib/log_analysis';
import { assertHasInfraMlPlugins } from '../../../utils/request_context';

export const initGetLogEntryCategoryExamplesRoute = ({ framework, sources }: InfraBackendLibs) => {
  framework.registerRoute(
    {
      method: 'post',
      path: LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORY_EXAMPLES_PATH,
      validate: {
        body: createValidationFunction(getLogEntryCategoryExamplesRequestPayloadRT),
      },
    },
    framework.router.handleLegacyErrors(async (requestContext, request, response) => {
      const {
        data: {
          categoryId,
          exampleCount,
          sourceId,
          timeRange: { startTime, endTime },
        },
      } = request.body;

      const sourceConfiguration = await sources.getSourceConfiguration(
        requestContext.core.savedObjects.client,
        sourceId
      );

      try {
        assertHasInfraMlPlugins(requestContext);

        const { data: logEntryCategoryExamples, timing } = await getLogEntryCategoryExamples(
          requestContext,
          sourceId,
          startTime,
          endTime,
          categoryId,
          exampleCount,
          sourceConfiguration
        );

        return response.ok({
          body: getLogEntryCategoryExamplesSuccessReponsePayloadRT.encode({
            data: {
              examples: logEntryCategoryExamples,
            },
            timing,
          }),
        });
      } catch (error) {
        if (Boom.isBoom(error)) {
          throw error;
        }

        if (error instanceof NoLogAnalysisResultsIndexError) {
          return response.notFound({ body: { message: error.message } });
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
