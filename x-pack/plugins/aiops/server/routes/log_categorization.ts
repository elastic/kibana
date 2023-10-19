/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { categorizationExamplesProvider } from '@kbn/ml-category-validator';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { categorizationFieldValidationSchema } from '../../common/api/log_categorization/schema';
import { AIOPS_API_ENDPOINT } from '../../common/api';
import type { AiopsLicense } from '../types';
import { wrapError } from './error_wrapper';
import { trackAIOpsRouteUsage } from '../lib/track_route_usage';
import { AIOPS_TELEMETRY_ID } from '../../common/constants';

export const defineLogCategorizationRoutes = (
  router: IRouter<DataRequestHandlerContext>,
  license: AiopsLicense,
  usageCounter?: UsageCounter
) => {
  router.versioned
    .post({
      path: AIOPS_API_ENDPOINT.CATEGORIZATION_FIELD_VALIDATION,
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: categorizationFieldValidationSchema,
          },
        },
      },
      async (context, request, response) => {
        const { headers } = request;
        trackAIOpsRouteUsage(
          `POST ${AIOPS_API_ENDPOINT.CATEGORIZATION_FIELD_VALIDATION}`,
          headers[AIOPS_TELEMETRY_ID.AIOPS_ANALYSIS_RUN_ORIGIN],
          usageCounter
        );

        if (!license.isActivePlatinumLicense) {
          return response.forbidden();
        }
        try {
          const {
            elasticsearch: { client },
          } = await context.core;

          const {
            indexPatternTitle,
            timeField,
            query,
            size,
            field,
            start,
            end,
            analyzer,
            runtimeMappings,
            indicesOptions,
            includeExamples,
          } = request.body;

          const { validateCategoryExamples } = categorizationExamplesProvider(client);
          const resp = await validateCategoryExamples(
            indexPatternTitle,
            query,
            size,
            field,
            timeField,
            start,
            end,
            analyzer ?? {},
            runtimeMappings,
            indicesOptions,
            includeExamples
          );

          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      }
    );
};
