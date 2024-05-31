/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { createValidationFunction } from '@kbn/logs-shared-plugin/common/runtime_types';
import {
  LOG_ANALYSIS_GET_ID_FORMATS,
  getLogAnalysisIdFormatsRequestPayloadRT,
  getLogAnalysisIdFormatsSuccessResponsePayloadRT,
} from '../../../common/http_api/latest';
import { InfraBackendLibs } from '../../lib/infra_types';
import { isMlPrivilegesError } from '../../lib/log_analysis';
import { resolveIdFormats } from '../../lib/log_analysis/resolve_id_formats';
import { assertHasInfraMlPlugins } from '../../utils/request_context';

export const initGetLogAnalysisIdFormatsRoute = ({ framework }: InfraBackendLibs) => {
  framework
    .registerVersionedRoute({
      access: 'internal',
      method: 'post',
      path: LOG_ANALYSIS_GET_ID_FORMATS,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: createValidationFunction(getLogAnalysisIdFormatsRequestPayloadRT),
          },
        },
      },
      framework.router.handleLegacyErrors(async (requestContext, request, response) => {
        const {
          data: { logViewId, spaceId },
        } = request.body;

        try {
          const infraMlContext = await assertHasInfraMlPlugins(requestContext);
          const mlAnomalyDetectors = (await infraMlContext.infra).mlAnomalyDetectors;

          const idFormatByJobType = await resolveIdFormats(logViewId, spaceId, mlAnomalyDetectors);

          return response.ok({
            body: getLogAnalysisIdFormatsSuccessResponsePayloadRT.encode({
              data: idFormatByJobType,
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
