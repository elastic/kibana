/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import Boom from 'boom';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';

import {
  getLogEntryCategoryExamplesRequestPayloadRT,
  getLogEntryCategoryExamplesSuccessReponsePayloadRT,
  LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORY_EXAMPLES_PATH,
} from '../../../../common/http_api/log_analysis';
import { throwErrors } from '../../../../common/runtime_types';
import { InfraBackendLibs } from '../../../lib/infra_types';
import { NoLogAnalysisResultsIndexError } from '../../../lib/log_analysis';

const anyObject = schema.object({}, { unknowns: 'allow' });

export const initGetLogEntryCategoryExamplesRoute = ({
  framework,
  logEntryCategoriesAnalysis,
}: InfraBackendLibs) => {
  framework.registerRoute(
    {
      method: 'post',
      path: LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORY_EXAMPLES_PATH,
      validate: {
        // short-circuit forced @kbn/config-schema validation so we can do io-ts validation
        body: anyObject,
      },
    },
    async (requestContext, request, response) => {
      const {
        data: {
          categoryId,
          exampleCount,
          sourceId,
          timeRange: { startTime, endTime },
        },
      } = pipe(
        getLogEntryCategoryExamplesRequestPayloadRT.decode(request.body),
        fold(throwErrors(Boom.badRequest), identity)
      );

      try {
        const {
          data: logEntryCategoryExamples,
          timing,
        } = await logEntryCategoriesAnalysis.getLogEntryCategoryExamples(
          requestContext,
          request,
          sourceId,
          startTime,
          endTime,
          categoryId,
          exampleCount
        );

        return response.ok({
          body: getLogEntryCategoryExamplesSuccessReponsePayloadRT.encode({
            data: {
              examples: logEntryCategoryExamples,
            },
            timing,
          }),
        });
      } catch (e) {
        const { statusCode = 500, message = 'Unknown error occurred' } = e;

        if (e instanceof NoLogAnalysisResultsIndexError) {
          return response.notFound({ body: { message } });
        }

        return response.customError({
          statusCode,
          body: { message },
        });
      }
    }
  );
};
