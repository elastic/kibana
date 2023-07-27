/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { RISK_ENGINE_INIT_URL } from '../../../../common/constants';

import type { SecuritySolutionPluginRouter } from '../../../types';

export const riskEngineInitRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.post(
    {
      path: RISK_ENGINE_INIT_URL,
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
      const spaceId = securitySolution.getSpaceId();

      try {
        const initResult = await riskEgineClient.init({
          savedObjectsClient: soClient,
          namespace: spaceId,
        });

        if (
          !initResult.riskEngineEnabled ||
          !initResult.riskEngineResourcesInstalled ||
          !initResult.riskEngineConfigurationCreated
        ) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return siemResponse.error({
            statusCode: 400,
            body: {
              message: initResult.errors.join('\n'),
              full_error: initResult,
            },
          });
        }

        return response.ok({ body: { result: initResult } });
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
