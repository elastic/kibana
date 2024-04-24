/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '../../../../utils/build_validation/route_validation';
import { AssetCriticalityRecordIdParts } from '../../../../../common/api/entity_analytics';
import { ENTITY_STORE_ENTITY_HISTORY_URL } from '../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
export const entityStoreGetHistoryRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: ENTITY_STORE_ENTITY_HISTORY_URL,
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: buildRouteValidationWithZod(AssetCriticalityRecordIdParts),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        const securitySolution = await context.securitySolution;
        const entityStoreDataClient = securitySolution.getEntityStoreDataClient();
        const { id_field: idField, id_value: idValue } = request.query;
        try {
          const { history } = await entityStoreDataClient.getEntityHistory({
            idField,
            idValue,
          });

          return response.ok({
            body: {
              history,
            },
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
