/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';

import { InfraBackendLibs } from '../../../lib/infra_types';
import {
  LOG_ANALYSIS_VALIDATE_DATASETS_PATH,
  validateLogEntryDatasetsRequestPayloadRT,
  validateLogEntryDatasetsResponsePayloadRT,
} from '../../../../common/http_api';

import { createValidationFunction } from '../../../../common/runtime_types';

export const initValidateLogAnalysisDatasetsRoute = ({
  framework,
  logEntries,
}: InfraBackendLibs) => {
  framework.registerRoute(
    {
      method: 'post',
      path: LOG_ANALYSIS_VALIDATE_DATASETS_PATH,
      validate: {
        body: createValidationFunction(validateLogEntryDatasetsRequestPayloadRT),
      },
    },
    framework.router.handleLegacyErrors(async (requestContext, request, response) => {
      try {
        const {
          data: { indices, timestampField, startTime, endTime },
        } = request.body;

        const datasets = await Promise.all(
          indices.map(async (indexName) => {
            const indexDatasets = await logEntries.getLogEntryDatasets(
              requestContext,
              timestampField,
              indexName,
              startTime,
              endTime
            );

            return {
              indexName,
              datasets: indexDatasets,
            };
          })
        );

        return response.ok({
          body: validateLogEntryDatasetsResponsePayloadRT.encode({ data: { datasets } }),
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
