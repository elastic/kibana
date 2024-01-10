/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { InfraBackendLibs } from '../../../lib/infra_types';

import { createValidationFunction } from '../../../../common/runtime_types';
import { logAnalysisValidationV1 } from '../../../../common/http_api';

export const initValidateLogAnalysisDatasetsRoute = ({
  framework,
  logEntries,
}: InfraBackendLibs) => {
  if (!framework.config.featureFlags.logsUIEnabled) {
    return;
  }
  framework
    .registerVersionedRoute({
      access: 'internal',
      method: 'post',
      path: logAnalysisValidationV1.LOG_ANALYSIS_VALIDATE_DATASETS_PATH,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: createValidationFunction(
              logAnalysisValidationV1.validateLogEntryDatasetsRequestPayloadRT
            ),
          },
        },
      },
      framework.router.handleLegacyErrors(async (requestContext, request, response) => {
        try {
          const {
            data: { indices, timestampField, startTime, endTime, runtimeMappings },
          } = request.body;

          const datasets = await Promise.all(
            indices.map(async (indexName) => {
              const indexDatasets = await logEntries.getLogEntryDatasets(
                requestContext,
                timestampField,
                indexName,
                startTime,
                endTime,
                runtimeMappings as estypes.MappingRuntimeFields
              );

              return {
                indexName,
                datasets: indexDatasets,
              };
            })
          );

          return response.ok({
            body: logAnalysisValidationV1.validateLogEntryDatasetsResponsePayloadRT.encode({
              data: { datasets },
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
