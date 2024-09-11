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

import type { StartEntityStoreResponse } from '../../../../../common/api/entity_analytics/entity_store/engine/start.gen';
import { StartEntityStoreRequestParams } from '../../../../../common/api/entity_analytics/entity_store/engine/start.gen';
import { API_VERSIONS, APP_ID } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';

export const startEntityEngineRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .post({
      access: 'public',
      path: '/api/entity_store/engines/{entityType}/start',
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
            params: buildRouteValidationWithZod(StartEntityStoreRequestParams),
            body: undefined,
          },
        },
      },

      async (context, request, response): Promise<IKibanaResponse<StartEntityStoreResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const secSol = await context.securitySolution;
          const engine = await secSol.getEntityStoreDataClient().start(request.params.entityType);

          return response.ok({ body: { started: engine.status === 'started' } });
        } catch (e) {
          logger.error('Error in StartEntityStore:', e);
          const error = transformError(e);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
