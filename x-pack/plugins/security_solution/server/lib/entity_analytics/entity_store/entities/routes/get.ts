/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { GetEntitiesRequestQuery } from '../../../../../../common/api/entity_analytics/entity_store/entities/get_entities.gen';
import { ENTITY_STORE_GET_ENTITIES_URL } from '../../../../../../common/entity_analytics/entity_store/constants';
import { API_VERSIONS } from '../../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../../types';

export const getEntitiesRoute = (router: EntityAnalyticsRoutesDeps['router']) => {
  router.versioned
    .get({
      access: 'internal',
      path: ENTITY_STORE_GET_ENTITIES_URL,
      options: {
        tags: ['access:securitySolution'],
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(GetEntitiesRequestQuery),
          },
        },
      },

      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const securitySolution = await context.securitySolution;

          const entityStoreDataClient = securitySolution.getEntityStoreDataClient();

          const entities = await entityStoreDataClient.search({
            entityType: request.query.entity_type,
            entityIds: request.query.entity_id,
          });

          return response.ok({
            body: entities,
          });
        } catch (e) {
          const error = transformError(e);

          return siemResponse.error({
            statusCode: error.statusCode,
            body: { message: error.message, full_error: JSON.stringify(e) },
            bypassErrorFormat: true,
          });
        }
      }
    );
};
