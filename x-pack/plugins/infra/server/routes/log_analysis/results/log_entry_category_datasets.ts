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
  getLogEntryCategoryDatasetsRequestPayloadRT,
  getLogEntryCategoryDatasetsSuccessReponsePayloadRT,
  LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORY_DATASETS_PATH,
} from '../../../../common/http_api/log_analysis';
import { throwErrors } from '../../../../common/runtime_types';
import { InfraBackendLibs } from '../../../lib/infra_types';
import { NoLogAnalysisResultsIndexError } from '../../../lib/log_analysis';

const anyObject = schema.object({}, { allowUnknowns: true });

export const initGetLogEntryCategoryDatasetsRoute = ({
  framework,
  logEntryCategoriesAnalysis,
}: InfraBackendLibs) => {
  framework.registerRoute(
    {
      method: 'post',
      path: LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORY_DATASETS_PATH,
      validate: {
        // short-circuit forced @kbn/config-schema validation so we can do io-ts validation
        body: anyObject,
      },
    },
    async (requestContext, request, response) => {
      const {
        data: {
          sourceId,
          timeRange: { startTime, endTime },
        },
      } = pipe(
        getLogEntryCategoryDatasetsRequestPayloadRT.decode(request.body),
        fold(throwErrors(Boom.badRequest), identity)
      );

      try {
        const {
          data: logEntryCategoryDatasets,
          timing,
        } = await logEntryCategoriesAnalysis.getLogEntryCategoryDatasets(
          requestContext,
          request,
          sourceId,
          startTime,
          endTime
        );

        return response.ok({
          body: getLogEntryCategoryDatasetsSuccessReponsePayloadRT.encode({
            data: {
              datasets: logEntryCategoryDatasets,
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
