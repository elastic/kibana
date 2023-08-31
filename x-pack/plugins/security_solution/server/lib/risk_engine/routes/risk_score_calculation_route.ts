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
  DEFAULT_RISK_SCORE_PAGE_SIZE,
  RISK_SCORE_CALCULATION_URL,
} from '../../../../common/constants';
import { riskScoreCalculationRequestSchema } from '../../../../common/risk_engine/risk_score_calculation/request_schema';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { riskScoreServiceFactory } from '../risk_score_service';
import { getRiskInputsIndex } from '../get_risk_inputs_index';

export const riskScoreCalculationRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.post(
    {
      path: RISK_SCORE_CALCULATION_URL,
      validate: { body: buildRouteValidation(riskScoreCalculationRequestSchema) },
      options: {
        tags: ['access:securitySolution'],
      },
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
        range,
        weights,
      } = request.body;

      try {
        const { index, runtimeMappings } = await getRiskInputsIndex({
          dataViewId,
          logger,
          soClient,
        });

        const afterKeys = userAfterKeys ?? {};
        const pageSize = userPageSize ?? DEFAULT_RISK_SCORE_PAGE_SIZE;

        const result = await riskScoreService.calculateAndPersistScores({
          afterKeys,
          debug,
          pageSize,
          identifierType,
          index,
          filter,
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
