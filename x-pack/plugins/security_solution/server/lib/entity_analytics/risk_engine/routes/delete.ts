/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { withRiskEnginePrivilegeCheck } from '../risk_engine_privileges';
import { RISK_ENGINE_CLEANUP_URL, APP_ID, API_VERSIONS } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { RiskEngineAuditActions } from '../audit';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../../audit';
import { TASK_MANAGER_UNAVAILABLE_ERROR } from './translations';
import type { CleanUpRiskEngineResponse } from '../../../../../common/api/entity_analytics';

export const riskEngineCleanupRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices']
) => {
  router.versioned
    .delete({
      access: 'public',
      path: RISK_ENGINE_CLEANUP_URL,
      options: {
        tags: ['access:securitySolution', `access:${APP_ID}-entity-analytics`],
      },
    })
    .addVersion(
      { version: API_VERSIONS.public.v1, validate: {} },
      withRiskEnginePrivilegeCheck(
        getStartServices,
        async (context, request, response): Promise<IKibanaResponse<CleanUpRiskEngineResponse>> => {
          const siemResponse = buildSiemResponse(response);
          const securitySolution = await context.securitySolution;
          const [_, { taskManager }] = await getStartServices();
          const riskEngineClient = securitySolution.getRiskEngineDataClient();
          const riskScoreDataClient = securitySolution.getRiskScoreDataClient();

          if (!taskManager) {
            securitySolution.getAuditLogger()?.log({
              message:
                'User attempted to perform a cleanup of risk engine, but the Kibana Task Manager was unavailable',
              event: {
                action: RiskEngineAuditActions.RISK_ENGINE_REMOVE_TASK,
                category: AUDIT_CATEGORY.DATABASE,
                type: AUDIT_TYPE.DELETION,
                outcome: AUDIT_OUTCOME.FAILURE,
              },
              error: {
                message:
                  'User attempted to perform a cleanup of risk engine, but the Kibana Task Manager was unavailable',
              },
            });

            return siemResponse.error({
              statusCode: 400,
              body: TASK_MANAGER_UNAVAILABLE_ERROR,
            });
          }

          try {
            const errors = await riskEngineClient.tearDown({
              taskManager,
              riskScoreDataClient,
            });
            if (errors && errors.length > 0) {
              return siemResponse.error({
                statusCode: errors.some((error) =>
                  error.message.includes('Risk engine is disabled or deleted already.')
                )
                  ? 400
                  : 500,
                body: {
                  cleanup_successful: false,
                  errors: errors.map((error, seq) => ({
                    seq: seq + 1,
                    error: error.toString(),
                  })),
                },
                bypassErrorFormat: true,
              });
            } else {
              return response.ok({ body: { cleanup_successful: true } });
            }
          } catch (error) {
            return siemResponse.error({
              statusCode: 500,
              body: {
                cleanup_successful: false,
                errors: {
                  seq: 1,
                  error: JSON.stringify(error),
                },
              },
              bypassErrorFormat: true,
            });
          }
        }
      )
    );
};
