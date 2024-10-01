/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { IKibanaResponse } from '@kbn/core-http-server';
import type { ConfigureRiskEngineResponse } from '../../../../../../common/api/entity_analytics/risk_engine';
import { RISK_ENGINE_SAVED_OBJECT_CONFIG_URL, APP_ID } from '../constants';
import type { EntityAnalyticsRoutesDeps } from '../../../types';

export const riskEngineSOConfigurationRoute = (router: EntityAnalyticsRoutesDeps['router']) => {
  router.versioned
    .post({
      access: 'public',
      path: RISK_ENGINE_SAVED_OBJECT_CONFIG_URL,
      options: {
        tags: ['access:securitySolution', `access:${APP_ID}-entity-analytics`],
      },
    })
    .addVersion(
      { version: '2023-10-31', validate: {} },
      async (context, request, response): Promise<IKibanaResponse<ConfigureRiskEngineResponse>> => {
        const siemResponse = buildSiemResponse(response);

        const attributes: {} = request.body || {};

        const securitySolution = await context.securitySolution;
        const riskEngineClient = securitySolution.getRiskEngineDataClient();

        try {
          const result = riskEngineClient.updateSavedObjectConfiguration({ attributes });
          if (!result) {
            throw new Error('Unable to update risk engine configuration');
          }
          return response.ok({
            body: {
              configuration_successful: true,
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
      }
    );
};
