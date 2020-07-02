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

import { throwErrors } from '../../../../common/runtime_types';
import { InfraBackendLibs } from '../../../lib/infra_types';
import { NoLogAnalysisResultsIndexError, getLogEntryRateExamples } from '../../../lib/log_analysis';
import { assertHasInfraMlPlugins } from '../../../utils/request_context';
import {
  getLogEntryRateExamplesRequestPayloadRT,
  getLogEntryRateExamplesSuccessReponsePayloadRT,
  LOG_ANALYSIS_GET_LOG_ENTRY_RATE_EXAMPLES_PATH,
} from '../../../../common/http_api/log_analysis';

const anyObject = schema.object({}, { unknowns: 'allow' });

export const initGetLogEntryRateExamplesRoute = ({ framework, sources }: InfraBackendLibs) => {
  framework.registerRoute(
    {
      method: 'post',
      path: LOG_ANALYSIS_GET_LOG_ENTRY_RATE_EXAMPLES_PATH,
      validate: {
        body: createValidationFunction(getLogEntryRateExamplesRequestPayloadRT),
      },
    },
    async (requestContext, request, response) => {
      const {
        data: {
          dataset,
          exampleCount,
          sourceId,
          timeRange: { startTime, endTime },
        },
      } = pipe(
        getLogEntryRateExamplesRequestPayloadRT.decode(request.body),
        fold(throwErrors(Boom.badRequest), identity)
      );

      const sourceConfiguration = await sources.getSourceConfiguration(
        requestContext.core.savedObjects.client,
        sourceId
      );

      try {
        assertHasInfraMlPlugins(requestContext);

        const { data: logEntryRateExamples, timing } = await getLogEntryRateExamples(
          requestContext,
          sourceId,
          startTime,
          endTime,
          dataset,
          exampleCount,
          sourceConfiguration,
          framework.callWithRequest
        );

        return response.ok({
          body: getLogEntryRateExamplesSuccessReponsePayloadRT.encode({
            data: {
              examples: logEntryRateExamples,
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
