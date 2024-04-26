/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { RISK_ENGINE_ENABLE_URL, APP_ID } from '../../../../../common/constants';
import { TASK_MANAGER_UNAVAILABLE_ERROR } from './translations';
import { withRiskEnginePrivilegeCheck } from '../risk_engine_privileges';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { RiskEngineAuditActions } from '../audit';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../../audit';

export const riskEngineEnableRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices']
) => {
  router.versioned
    .post({
      access: 'internal',
      path: RISK_ENGINE_ENABLE_URL,
      options: {
        tags: ['access:securitySolution', `access:${APP_ID}-entity-analytics`],
      },
    })
    .addVersion(
      { version: '1', validate: {} },
      withRiskEnginePrivilegeCheck(getStartServices, async (context, request, response) => {
        const securitySolution = await context.securitySolution;

        securitySolution.getAuditLogger()?.log({
          message: 'User attempted to enable the risk engine',
          event: {
            action: RiskEngineAuditActions.RISK_ENGINE_ENABLE,
            category: AUDIT_CATEGORY.DATABASE,
            type: AUDIT_TYPE.CHANGE,
            outcome: AUDIT_OUTCOME.UNKNOWN,
          },
        });

        const siemResponse = buildSiemResponse(response);
        const [_, { taskManager }] = await getStartServices();
        const riskEngineClient = securitySolution.getRiskEngineDataClient();
        if (!taskManager) {
          securitySolution.getAuditLogger()?.log({
            message:
              'User attempted to enable the risk engine, but the Kibana Task Manager was unavailable',
            event: {
              action: RiskEngineAuditActions.RISK_ENGINE_ENABLE,
              category: AUDIT_CATEGORY.DATABASE,
              type: AUDIT_TYPE.CHANGE,
              outcome: AUDIT_OUTCOME.FAILURE,
            },
            error: {
              message:
                'User attempted to enable the risk engine, but the Kibana Task Manager was unavailable',
            },
          });

          return siemResponse.error({
            statusCode: 400,
            body: TASK_MANAGER_UNAVAILABLE_ERROR,
          });
        }

        try {
          await riskEngineClient.enableRiskEngine({ taskManager });
          return response.ok({ body: { success: true } });
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
