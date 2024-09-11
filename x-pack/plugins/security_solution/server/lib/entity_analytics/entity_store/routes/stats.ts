/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';

import type { GetEntityStoreStatsResponse } from '../../../../../common/api/entity_analytics/entity_store/engine/stats.gen';
import { GetEntityStoreStatsRequestParams } from '../../../../../common/api/entity_analytics/entity_store/engine/stats.gen';
import { API_VERSIONS, APP_ID } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';

export const getEntityEngineStatsRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .post({
      access: 'public',
      path: '/api/entity_store/engines/{entityType}/stats',
      options: {
        tags: ['access:securitySolution', `access:${APP_ID}-entity-analytics`],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: undefined,
            params: buildRouteValidationWithZod(GetEntityStoreStatsRequestParams),
            body: undefined,
          },
        },
      },

      async (context, request, response): Promise<IKibanaResponse<GetEntityStoreStatsResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          // TODO
          throw new Error('Not implemented');

          // return response.ok({ body });
        } catch (e) {
          logger.error('Error in GetEntityStoreStats:', e);
          const error = transformError(e);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
