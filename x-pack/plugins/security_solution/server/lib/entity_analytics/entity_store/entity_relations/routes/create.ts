/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// import type { IKibanaResponse, KibanaResponseFactory, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { CreateEntityRelationResponse } from '../../../../../../common/api/entity_analytics/entity_store/relations/create_entity_relation.gen';
import { CreateEntityRelationRequestBody } from '../../../../../../common/api/entity_analytics/entity_store/relations/create_entity_relation.gen';
import { ENTITY_STORE_CREATE_RELATION_URL } from '../../../../../../common/entity_analytics/entity_store/constants';
import { API_VERSIONS } from '../../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../../types';

export const createRelatedEntitiesRoute = (router: EntityAnalyticsRoutesDeps['router']) => {
  router.versioned
    .post({
      access: 'internal',
      path: ENTITY_STORE_CREATE_RELATION_URL,
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: { body: buildRouteValidationWithZod(CreateEntityRelationRequestBody) },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const securitySolution = await context.securitySolution;
          const entityRelationsDataClient = securitySolution.getEntityRelationsDataClient();

          await entityRelationsDataClient.create(request.body);

          const body: CreateEntityRelationResponse = { acknowledged: true };
          return response.ok({
            body,
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
