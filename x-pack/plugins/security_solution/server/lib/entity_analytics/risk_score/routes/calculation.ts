/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { RiskScoresCalculationRequest } from '../../../../../common/api/entity_analytics/risk_engine/calculation_route.gen';
import {
  APP_ID,
  DEFAULT_RISK_SCORE_PAGE_SIZE,
  RISK_SCORE_CALCULATION_URL,
} from '../../../../../common/constants';
import { getRiskInputsIndex } from '../get_risk_inputs_index';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { RiskScoreAuditActions } from '../audit';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../../audit';
import { buildRiskScoreServiceForRequest } from './helpers';

export const riskScoreCalculationRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .post({
      path: RISK_SCORE_CALCULATION_URL,
      access: 'internal',
      options: {
        tags: ['access:securitySolution', `access:${APP_ID}-entity-analytics`],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: { request: { body: buildRouteValidationWithZod(RiskScoresCalculationRequest) } },
      },
      async (context, request, response) => {
        const securityContext = await context.securitySolution;

        securityContext.getAuditLogger()?.log({
          message: 'User triggered custom manual scoring',
          event: {
            action: RiskScoreAuditActions.RISK_ENGINE_MANUAL_SCORING,
            category: AUDIT_CATEGORY.DATABASE,
            type: AUDIT_TYPE.CHANGE,
            outcome: AUDIT_OUTCOME.UNKNOWN,
          },
        });

        const siemResponse = buildSiemResponse(response);
        const coreContext = await context.core;
        const soClient = coreContext.savedObjects.client;
        const securityConfig = await securityContext.getConfig();

        const riskScoreService = buildRiskScoreServiceForRequest(
          securityContext,
          coreContext,
          logger
        );

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
          const entityAnalyticsConfig = await riskScoreService.getConfigurationWithDefaults(
            securityConfig.entityAnalytics
          );

          const alertSampleSizePerShard = entityAnalyticsConfig?.alertSampleSizePerShard;

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
            alertSampleSizePerShard,
          });

          return response.ok({ body: result });
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
