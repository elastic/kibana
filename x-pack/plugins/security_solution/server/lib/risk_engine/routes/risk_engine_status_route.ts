/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { RISK_ENGINE_STATUS_URL } from '../../../../common/constants';

import type { SecuritySolutionPluginRouter } from '../../../types';

export const riskEngineStatusRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.get(
    {
      path: RISK_ENGINE_STATUS_URL,
      validate: {},
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      const securitySolution = await context.securitySolution;
      const soClient = (await context.core).savedObjects.client;
      const riskEngineClient = securitySolution.getRiskEngineDataClient();
      const spaceId = securitySolution.getSpaceId();

      try {
        const result = await riskEngineClient.getStatus({
          savedObjectsClient: soClient,
          namespace: spaceId,
        });
        return response.ok({
          body: {
            risk_engine_status: result.riskEngineStatus,
            legacy_risk_engine_status: result.legacyRiskEngineStatus,
          },
        });
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
