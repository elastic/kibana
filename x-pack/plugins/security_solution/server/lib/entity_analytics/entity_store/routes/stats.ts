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

import type { GetEntityEngineStatsResponse } from '../../../../../common/api/entity_analytics/entity_store/engine/stats.gen';
import { GetEntityEngineStatsRequestParams } from '../../../../../common/api/entity_analytics/entity_store/engine/stats.gen';
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
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetEntityEngineStatsRequestParams),
          },
        },
      },

      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<GetEntityEngineStatsResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          // TODO
          throw new Error('Not implemented');

          // return response.ok({ body });
        } catch (e) {
          logger.error('Error in GetEntityEngineStats:', e);
          const error = transformError(e);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
