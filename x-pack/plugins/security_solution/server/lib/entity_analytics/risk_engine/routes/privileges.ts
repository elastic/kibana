/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { RISK_ENGINE_PRIVILEGES_URL, APP_ID } from '../../../../../common/constants';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../../audit';
import { RiskScoreAuditActions } from '../../risk_score/audit';
import type { EntityAnalyticsRoutesDeps } from '../../types';

import { getUserRiskEnginePrivileges } from '../risk_engine_privileges';

export const riskEnginePrivilegesRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices']
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
      const securitySolution = await context.securitySolution;

      const body = await getUserRiskEnginePrivileges(request, security);

      securitySolution.getAuditLogger()?.log({
        message: 'User checked if they have the required privileges to configure the risk engine',
        event: {
          action: RiskScoreAuditActions.RISK_ENGINE_PRIVILEGES_GET,
          category: AUDIT_CATEGORY.AUTHENTICATION,
          type: AUDIT_TYPE.ACCESS,
          outcome: AUDIT_OUTCOME.SUCCESS,
        },
      });

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
