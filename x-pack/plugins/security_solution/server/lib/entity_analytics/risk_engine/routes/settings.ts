/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { RISK_ENGINE_SETTINGS_URL, APP_ID } from '../../../../../common/constants';

import type { SecuritySolutionPluginRouter } from '../../../../types';

export const riskEngineSettingsRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .get({
      access: 'internal',
      path: RISK_ENGINE_SETTINGS_URL,
      options: {
        tags: ['access:securitySolution', `access:${APP_ID}-entity-analytics`],
      },
    })
    .addVersion({ version: '1', validate: {} }, async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      const securitySolution = await context.securitySolution;
      const riskEngineClient = securitySolution.getRiskEngineDataClient();

      try {
        const result = await riskEngineClient.getConfiguration();
        if (!result) {
          throw new Error('Unable to get risk engine configuration');
        }
        return response.ok({
          body: {
            range: result.range,
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
    });
};
