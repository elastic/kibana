/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';

import type { InitEntityEngineResponse } from '../../../../../common/api/entity_analytics/entity_store/engine/init.gen';
import {
  InitEntityEngineRequestBody,
  InitEntityEngineRequestParams,
} from '../../../../../common/api/entity_analytics/entity_store/engine/init.gen';
import { API_VERSIONS, APP_ID } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { checkAndInitAssetCriticalityResources } from '../../asset_criticality/check_and_init_asset_criticality_resources';
import { TASK_MANAGER_UNAVAILABLE_ERROR } from '../../risk_engine/routes/translations';

export const initEntityEngineRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices']
) => {
  router.versioned
    .post({
      access: 'public',
      path: '/api/entity_store/engines/{entityType}/init',
      options: {
        tags: ['access:securitySolution', `access:${APP_ID}-entity-analytics`],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(InitEntityEngineRequestParams),
            body: buildRouteValidationWithZod(InitEntityEngineRequestBody),
          },
        },
      },

      async (context, request, response): Promise<IKibanaResponse<InitEntityEngineResponse>> => {
        await checkAndInitAssetCriticalityResources(context, logger);
        const secSol = await context.securitySolution;
        const [_, { taskManager }] = await getStartServices();
        const riskScoreDataClient = secSol.getRiskScoreDataClient();
        await riskScoreDataClient.createRiskScoreLatestIndex();
        const siemResponse = buildSiemResponse(response);
        try {
          if (!taskManager) {
            return siemResponse.error({
              statusCode: 400,
              body: TASK_MANAGER_UNAVAILABLE_ERROR,
            });
          }
          const body: InitEntityEngineResponse = await secSol
            .getEntityStoreDataClient()
            .init(request.params.entityType, taskManager, request.body);

          return response.ok({ body });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error initialising entity engine: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
