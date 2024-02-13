/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { StartServicesAccessor } from '@kbn/core/server';
import { RISK_ENGINE_PRIVILEGES_URL, APP_ID } from '../../../../../common/constants';

import type { StartPlugins } from '../../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { getUserRiskEnginePrivileges } from '../risk_engine_privileges';

export const riskEnginePrivilegesRoute = (
  router: SecuritySolutionPluginRouter,
  getStartServices: StartServicesAccessor<StartPlugins>
) => {
  router.versioned
    .get({
      access: 'internal',
      path: RISK_ENGINE_PRIVILEGES_URL,
      options: {
        tags: ['access:securitySolution', `access:${APP_ID}-entity-analytics`],
      },
    })
    .addVersion({ version: '1', validate: false }, async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      const [_, { security }] = await getStartServices();
      const body = await getUserRiskEnginePrivileges(request, security);

      try {
        return response.ok({
          body,
        });
      } catch (e) {
        const error = transformError(e);

        return siemResponse.error({
          statusCode: error.statusCode,
          body: error.message,
        });
      }
    });
};
