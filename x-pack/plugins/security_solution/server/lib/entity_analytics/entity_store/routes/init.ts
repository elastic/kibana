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

import type { InitEntityStoreResponse } from '../../../../../common/api/entity_analytics/entity_store/engine/init.gen';
import {
  InitEntityStoreRequestBody,
  InitEntityStoreRequestParams,
} from '../../../../../common/api/entity_analytics/entity_store/engine/init.gen';
import { API_VERSIONS, APP_ID } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';

export const initEntityEngineRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .post({
      access: 'public',
      path: '/api/entity_store/engines/{entityType}/init',
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
            params: buildRouteValidationWithZod(InitEntityStoreRequestParams),
            body: buildRouteValidationWithZod(InitEntityStoreRequestBody),
          },
        },
      },

      async (context, request, response): Promise<IKibanaResponse<InitEntityStoreResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const secSol = await context.securitySolution;

          const body: InitEntityStoreResponse = await secSol
            .getEntityStoreDataClient()
            .init(request.params.entityType, request.body);

          return response.ok({ body });
        } catch (e) {
          logger.error('Error in InitEntityStore:', e);
          const error = transformError(e);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
