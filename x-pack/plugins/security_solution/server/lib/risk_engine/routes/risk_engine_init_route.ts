/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { RISK_ENGINE_INIT_URL, APP_ID } from '../../../../common/constants';
import type { SetupPlugins } from '../../../plugin';

import type { SecuritySolutionPluginRouter } from '../../../types';

export const riskEngineInitRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  security: SetupPlugins['security']
) => {
  router.post(
    {
      path: RISK_ENGINE_INIT_URL,
      validate: {},
      options: {
        tags: ['access:securitySolution', `access:${APP_ID}-entity-analytics`],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const securitySolution = await context.securitySolution;
      const soClient = (await context.core).savedObjects.client;
      const riskEngineClient = securitySolution.getRiskEngineDataClient();
      const spaceId = securitySolution.getSpaceId();
      const user = security?.authc.getCurrentUser(request);

      try {
        const initResult = await riskEngineClient.init({
          savedObjectsClient: soClient,
          namespace: spaceId,
          user,
        });

        const initResultResponse = {
          risk_engine_enabled: initResult.riskEngineEnabled,
          risk_engine_resources_installed: initResult.riskEngineResourcesInstalled,
          risk_engine_configuration_created: initResult.riskEngineConfigurationCreated,
          legacy_risk_engine_disabled: initResult.legacyRiskEngineDisabled,
          errors: initResult.errors,
        };

        if (
          !initResult.riskEngineEnabled ||
          !initResult.riskEngineResourcesInstalled ||
          !initResult.riskEngineConfigurationCreated
        ) {
          return siemResponse.error({
            statusCode: 400,
            body: {
              message: initResultResponse.errors.join('\n'),
              full_error: initResultResponse,
            },
          });
        }
        return response.ok({ body: { result: initResultResponse } });
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
