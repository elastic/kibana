/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type {
  RiskEngineInitResponse,
  RiskEngineInitResult,
} from '../../../../../common/api/entity_analytics/risk_engine/engine_init_route.gen';
import { APP_ID, RISK_ENGINE_INIT_URL } from '../../../../../common/constants';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../../audit';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { RiskEngineAuditActions } from '../audit';
import { withRiskEnginePrivilegeCheck } from '../risk_engine_privileges';
import { TASK_MANAGER_UNAVAILABLE_ERROR } from './translations';
export const riskEngineInitRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices']
) => {
  router.versioned
    .post({
      access: 'internal',
      path: RISK_ENGINE_INIT_URL,
      options: {
        tags: ['access:securitySolution', `access:${APP_ID}-entity-analytics`],
      },
    })
    .addVersion(
      { version: '1', validate: {} },
      withRiskEnginePrivilegeCheck(getStartServices, async (context, request, response) => {
        const securitySolution = await context.securitySolution;

        securitySolution.getAuditLogger()?.log({
          message: 'User attempted to initialize the risk engine',
          event: {
            action: RiskEngineAuditActions.RISK_ENGINE_INIT,
            category: AUDIT_CATEGORY.DATABASE,
            type: AUDIT_TYPE.CHANGE,
            outcome: AUDIT_OUTCOME.UNKNOWN,
          },
        });

        const siemResponse = buildSiemResponse(response);
        const [_, { taskManager }] = await getStartServices();
        const riskEngineDataClient = securitySolution.getRiskEngineDataClient();
        const riskScoreDataClient = securitySolution.getRiskScoreDataClient();
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
            riskScoreDataClient,
          });

          const result: RiskEngineInitResult = {
            risk_engine_enabled: initResult.riskEngineEnabled,
            risk_engine_resources_installed: initResult.riskEngineResourcesInstalled,
            risk_engine_configuration_created: initResult.riskEngineConfigurationCreated,
            legacy_risk_engine_disabled: initResult.legacyRiskEngineDisabled,
            errors: initResult.errors,
          };

          const initResponse: RiskEngineInitResponse = {
            result,
          };

          if (
            !initResult.riskEngineEnabled ||
            !initResult.riskEngineResourcesInstalled ||
            !initResult.riskEngineConfigurationCreated
          ) {
            return siemResponse.error({
              statusCode: 400,
              body: {
                message: result.errors.join('\n'),
                full_error: result,
              },
              bypassErrorFormat: true,
            });
          }
          return response.ok({ body: initResponse });
        } catch (e) {
          const error = transformError(e);

          return siemResponse.error({
            statusCode: error.statusCode,
            body: { message: error.message, full_error: JSON.stringify(e) },
            bypassErrorFormat: true,
          });
        }
      })
    );
};
