/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import {
  getLogEntryAnomaliesDatasetsRequestPayloadRT,
  getLogEntryAnomaliesDatasetsSuccessReponsePayloadRT,
  LOG_ANALYSIS_GET_LOG_ENTRY_ANOMALIES_DATASETS_PATH,
} from '../../../../common/http_api/log_analysis';
import { createValidationFunction } from '../../../../common/runtime_types';
import type { InfraBackendLibs } from '../../../lib/infra_types';
import {
  getLogEntryAnomaliesDatasets,
  NoLogAnalysisResultsIndexError,
} from '../../../lib/log_analysis';
import { assertHasInfraMlPlugins } from '../../../utils/request_context';

export const initGetLogEntryAnomaliesDatasetsRoute = ({ framework }: InfraBackendLibs) => {
  framework.registerRoute(
    {
      method: 'post',
      path: LOG_ANALYSIS_GET_LOG_ENTRY_ANOMALIES_DATASETS_PATH,
      validate: {
        body: createValidationFunction(getLogEntryAnomaliesDatasetsRequestPayloadRT),
      },
    },
    framework.router.handleLegacyErrors(async (requestContext, request, response) => {
      const {
        data: {
          sourceId,
          timeRange: { startTime, endTime },
        },
      } = request.body;

      try {
        assertHasInfraMlPlugins(requestContext);

        const { datasets, timing } = await getLogEntryAnomaliesDatasets(
          requestContext,
          sourceId,
          startTime,
          endTime
        );

        return response.ok({
          body: getLogEntryAnomaliesDatasetsSuccessReponsePayloadRT.encode({
            data: {
              datasets,
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
