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

import type { DeleteEntityStoreResponse } from '../../../../../common/api/entity_analytics/entity_store/engine/delete.gen';
import {
  DeleteEntityStoreRequestQuery,
  DeleteEntityStoreRequestParams,
} from '../../../../../common/api/entity_analytics/entity_store/engine/delete.gen';
import { API_VERSIONS, APP_ID } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';

export const deleteEntityEngineRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .delete({
      access: 'public',
      path: '/api/entity_store/engines/{entityType}',
      options: {
        tags: ['access:securitySolution', `access:${APP_ID}-entity-analytics`],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(DeleteEntityStoreRequestQuery),
            params: buildRouteValidationWithZod(DeleteEntityStoreRequestParams),
          },
        },
      },

      async (context, request, response): Promise<IKibanaResponse<DeleteEntityStoreResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const secSol = await context.securitySolution;
          const body = await secSol
            .getEntityStoreDataClient()
            .delete(request.params.entityType, !!request.query.data);

          return response.ok({ body });
        } catch (e) {
          logger.error('Error in DeleteEntityStore:', e);
          const error = transformError(e);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
