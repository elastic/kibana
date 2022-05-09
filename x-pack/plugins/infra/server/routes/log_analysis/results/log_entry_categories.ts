/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  getLogEntryCategoriesRequestPayloadRT,
  getLogEntryCategoriesSuccessReponsePayloadRT,
  LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORIES_PATH,
} from '../../../../common/http_api/log_analysis';
import { createValidationFunction } from '../../../../common/runtime_types';
import type { InfraBackendLibs } from '../../../lib/infra_types';
import { getTopLogEntryCategories } from '../../../lib/log_analysis';
import { assertHasInfraMlPlugins } from '../../../utils/request_context';
import { isMlPrivilegesError } from '../../../lib/log_analysis/errors';

export const initGetLogEntryCategoriesRoute = ({ framework }: InfraBackendLibs) => {
  framework.registerRoute(
    {
      method: 'post',
      path: LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORIES_PATH,
      validate: {
        body: createValidationFunction(getLogEntryCategoriesRequestPayloadRT),
      },
    },
    framework.router.handleLegacyErrors(async (requestContext, request, response) => {
      const {
        data: {
          categoryCount,
          histograms,
          sourceId,
          timeRange: { startTime, endTime },
          datasets,
          sort,
        },
      } = request.body;

      try {
        const infraMlContext = await assertHasInfraMlPlugins(requestContext);

        const { data: topLogEntryCategories, timing } = await getTopLogEntryCategories(
          { infra: await infraMlContext.infra },
          sourceId,
          startTime,
          endTime,
          categoryCount,
          datasets ?? [],
          histograms.map((histogram) => ({
            bucketCount: histogram.bucketCount,
            endTime: histogram.timeRange.endTime,
            id: histogram.id,
            startTime: histogram.timeRange.startTime,
          })),
          sort
        );

        return response.ok({
          body: getLogEntryCategoriesSuccessReponsePayloadRT.encode({
            data: {
              categories: topLogEntryCategories,
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
