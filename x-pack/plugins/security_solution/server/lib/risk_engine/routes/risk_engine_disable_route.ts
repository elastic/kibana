/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { RISK_ENGINE_DISABLE_URL } from '../../../../common/constants';
import type { SetupPlugins } from '../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../types';

export const riskEngineDisableRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  security: SetupPlugins['security']
) => {
  router.post(
    {
      path: RISK_ENGINE_DISABLE_URL,
      validate: {},
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      const securitySolution = await context.securitySolution;
      const soClient = (await context.core).savedObjects.client;
      const riskEgineClient = securitySolution.getRiskEngineDataClient();
      const user = security?.authc.getCurrentUser(request);

      try {
        await riskEgineClient.disableRiskEngine({
          savedObjectsClient: soClient,
          user,
        });
        return response.ok({ body: { success: true } });
      } catch (e) {
        const error = transformError(e);

        return siemResponse.error({
          statusCode: error.statusCode,
          body: { message: error.message, full_error: JSON.stringify(e) },
        });
      }
    }
  );
};
