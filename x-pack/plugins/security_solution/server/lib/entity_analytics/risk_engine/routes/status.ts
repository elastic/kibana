/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { RiskEngineStatusResponse } from '../../../../../common/api/entity_analytics/risk_engine/engine_status_route.gen';
import { RISK_ENGINE_STATUS_URL, APP_ID } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';

export const riskEngineStatusRoute = (router: EntityAnalyticsRoutesDeps['router']) => {
  router.versioned
    .get({
      access: 'internal',
      path: RISK_ENGINE_STATUS_URL,
      options: {
        tags: ['access:securitySolution', `access:${APP_ID}-entity-analytics`],
      },
    })
    .addVersion({ version: '1', validate: {} }, async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      const securitySolution = await context.securitySolution;
      const riskEngineClient = securitySolution.getRiskEngineDataClient();
      const spaceId = securitySolution.getSpaceId();

      try {
        const { riskEngineStatus, legacyRiskEngineStatus, isMaxAmountOfRiskEnginesReached } =
          await riskEngineClient.getStatus({
            namespace: spaceId,
          });

        const body: RiskEngineStatusResponse = {
          risk_engine_status: riskEngineStatus,
          legacy_risk_engine_status: legacyRiskEngineStatus,
          is_max_amount_of_risk_engines_reached: isMaxAmountOfRiskEnginesReached,
        };

        return response.ok({ body });
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
