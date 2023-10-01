/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';

import {
  APP_ID,
  DEFAULT_RISK_SCORE_PAGE_SIZE,
  RISK_SCORE_PREVIEW_URL,
} from '../../../../common/constants';
import { riskScorePreviewRequestSchema } from '../../../../common/risk_engine/risk_score_preview/request_schema';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { riskScoreServiceFactory } from '../risk_score_service';
import { getRiskInputsIndex } from '../get_risk_inputs_index';

export const riskScorePreviewRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .post({
      access: 'internal',
      path: RISK_SCORE_PREVIEW_URL,
      options: {
        tags: ['access:securitySolution', `access:${APP_ID}-entity-analytics`],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: { request: { body: buildRouteValidation(riskScorePreviewRequestSchema) } },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        const securityContext = await context.securitySolution;
        const coreContext = await context.core;
        const esClient = coreContext.elasticsearch.client.asCurrentUser;
        const soClient = coreContext.savedObjects.client;
        const spaceId = securityContext.getSpaceId();
        const riskEngineDataClient = securityContext.getRiskEngineDataClient();

        const riskScoreService = riskScoreServiceFactory({
          esClient,
          logger,
          riskEngineDataClient,
          spaceId,
        });

        const {
          after_keys: userAfterKeys,
          data_view_id: dataViewId,
          debug,
          page_size: userPageSize,
          identifier_type: identifierType,
          filter,
          range: userRange,
          weights,
        } = request.body;

        try {
          const { index, runtimeMappings } = await getRiskInputsIndex({
            dataViewId,
            logger,
            soClient,
          });

          const afterKeys = userAfterKeys ?? {};
          const range = userRange ?? { start: 'now-15d', end: 'now' };
          const pageSize = userPageSize ?? DEFAULT_RISK_SCORE_PAGE_SIZE;

          const result = await riskScoreService.calculateScores({
            afterKeys,
            debug,
            filter,
            identifierType,
            index,
            pageSize,
            range,
            runtimeMappings,
            weights,
          });

          return response.ok({ body: result });
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
