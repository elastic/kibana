/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { ENTITY_STORE_INIT_URL } from '../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
export const entityStoreInitRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: ENTITY_STORE_INIT_URL,
      options: {
        tags: ['access:securitySolution'], // TODO entity store access `access:${APP_ID}-entity-analytics`
      },
    })
    .addVersion(
      { version: '1', validate: {} },
      // TODO Implement entity store privileges like `withRiskEnginePrivilegeCheck` in risk_engine_privileges.ts
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        const securitySolution = await context.securitySolution;
        const entityStoreDataClient = securitySolution.getEntityStoreDataClient();

        try {
          await entityStoreDataClient.init();

          return response.ok({
            body: {
              result: {
                entity_store_created: true,
                errors: [],
              },
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
