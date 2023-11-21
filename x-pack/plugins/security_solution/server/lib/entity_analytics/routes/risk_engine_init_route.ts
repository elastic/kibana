/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { RISK_ENGINE_INIT_URL, APP_ID } from '../../../../common/constants';
import type { StartPlugins } from '../../../plugin';
import { TASK_MANAGER_UNAVAILABLE_ERROR } from './translations';
import type { SecuritySolutionPluginRouter } from '../../../types';
import type { InitRiskEngineResultResponse } from '../types';

export const riskEngineInitRoute = (
  router: SecuritySolutionPluginRouter,
  getStartServices: StartServicesAccessor<StartPlugins>,
  logger: Logger,
  isAssetCriticalityEnabled: boolean
) => {
  router.versioned
    .post({
      access: 'internal',
      path: RISK_ENGINE_INIT_URL,
      options: {
        tags: ['access:securitySolution', `access:${APP_ID}-entity-analytics`],
      },
    })
    .addVersion({ version: '1', validate: {} }, async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const securitySolution = await context.securitySolution;
      const [_, { taskManager }] = await getStartServices();
      const riskEngineDataClient = securitySolution.getRiskEngineDataClient();
      const riskScoreDataClient = securitySolution.getRiskScoreDataClient();
      const assetCriticalityDataClient = securitySolution.getAssetCriticalityDataClient();
      const spaceId = securitySolution.getSpaceId();

      try {
        if (!taskManager) {
          return siemResponse.error({
            statusCode: 400,
            body: TASK_MANAGER_UNAVAILABLE_ERROR,
          });
        }

        const initResult = await riskEngineDataClient.init({
          taskManager,
          namespace: spaceId,
          isAssetCriticalityEnabled,
          assetCriticalityDataClient,
          riskScoreDataClient,
        });

        const initResultResponse: InitRiskEngineResultResponse = {
          risk_engine_enabled: initResult.riskEngineEnabled,
          risk_engine_resources_installed: initResult.riskEngineResourcesInstalled,
          risk_engine_configuration_created: initResult.riskEngineConfigurationCreated,
          legacy_risk_engine_disabled: initResult.legacyRiskEngineDisabled,
          errors: initResult.errors,
        };

        // TODO: after enabling asset criticality by default, we don't need assetCriticalityInstallFailed
        let assetCriticalityInstallFailed = false;
        if (isAssetCriticalityEnabled) {
          initResultResponse.asset_criticality_resources_installed = initResult.assetCriticalityInstalled;
          assetCriticalityInstallFailed = !initResult.assetCriticalityInstalled;
        }

        if (
          !initResult.riskEngineEnabled ||
          !initResult.riskEngineResourcesInstalled ||
          !initResult.riskEngineConfigurationCreated ||
          assetCriticalityInstallFailed
        ) {
          return siemResponse.error({
            statusCode: 400,
            body: {
              message: initResultResponse.errors.join('\n'),
              full_error: initResultResponse,
            },
            bypassErrorFormat: true,
          });
        }
        return response.ok({ body: { result: initResultResponse } });
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
