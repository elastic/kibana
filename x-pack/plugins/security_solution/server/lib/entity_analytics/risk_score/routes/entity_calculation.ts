/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';

import { isEmpty } from 'lodash/fp';
import type { RiskScoresCalculationResponse } from '../../../../../common/api/entity_analytics/risk_engine/calculation_route.gen';
import type { AfterKeys } from '../../../../../common/api/entity_analytics/common';
import { RiskScoresEntityCalculationRequest } from '../../../../../common/api/entity_analytics/risk_engine/entity_calculation_route.gen';
import { APP_ID, RISK_SCORE_ENTITY_CALCULATION_URL } from '../../../../../common/constants';
import { buildRouteValidationWithZod } from '../../../../utils/build_validation/route_validation';
import { getRiskInputsIndex } from '../get_risk_inputs_index';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { RiskScoreAuditActions } from '../audit';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../../audit';
import { convertRangeToISO } from '../tasks/helpers';
import { buildRiskScoreServiceForRequest } from './helpers';
import { getFieldForIdentifier } from '../helpers';
import { withRiskEnginePrivilegeCheck } from '../../risk_engine/risk_engine_privileges';

export const riskScoreEntityCalculationRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'],
  logger: Logger
) => {
  router.versioned
    .post({
      path: RISK_SCORE_ENTITY_CALCULATION_URL,
      access: 'internal',
      options: {
        tags: ['access:securitySolution', `access:${APP_ID}-entity-analytics`],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(RiskScoresEntityCalculationRequest),
          },
        },
      },
      withRiskEnginePrivilegeCheck(getStartServices, async (context, request, response) => {
        const securityContext = await context.securitySolution;

        securityContext.getAuditLogger()?.log({
          message: 'User triggered custom manual scoring',
          event: {
            action: RiskScoreAuditActions.RISK_ENGINE_ENTITY_MANUAL_SCORING,
            category: AUDIT_CATEGORY.DATABASE,
            type: AUDIT_TYPE.CHANGE,
            outcome: AUDIT_OUTCOME.UNKNOWN,
          },
        });

        const coreContext = await context.core;
        const securityConfig = await securityContext.getConfig();
        const siemResponse = buildSiemResponse(response);
        const soClient = coreContext.savedObjects.client;

        const riskScoreService = buildRiskScoreServiceForRequest(
          securityContext,
          coreContext,
          logger
        );

        const { identifier_type: identifierType, identifier, refresh } = request.body;

        try {
          const entityAnalyticsConfig = await riskScoreService.getConfigurationWithDefaults(
            securityConfig.entityAnalytics
          );

          if (entityAnalyticsConfig == null) {
            return siemResponse.error({
              statusCode: 400,
              body: 'No Risk engine configuration found',
            });
          }

          const {
            dataViewId,
            enabled,
            range: configuredRange,
            pageSize,
            alertSampleSizePerShard,
            filter: userFilter,
          } = entityAnalyticsConfig;

          if (!enabled) {
            return siemResponse.error({
              statusCode: 400,
              body: 'Risk engine is disabled',
            });
          }

          const { index, runtimeMappings } = await getRiskInputsIndex({
            dataViewId,
            logger,
            soClient,
          });

          const range = convertRangeToISO(configuredRange);

          const afterKeys: AfterKeys = {};

          const identifierFilter = {
            term: { [getFieldForIdentifier(identifierType)]: identifier },
          };

          const filter = isEmpty(userFilter) ? [identifierFilter] : [userFilter, identifierFilter];

          const result: RiskScoresCalculationResponse =
            await riskScoreService.calculateAndPersistScores({
              pageSize,
              identifierType,
              index,
              filter: {
                bool: {
                  filter,
                },
              },
              range,
              runtimeMappings,
              weights: [],
              alertSampleSizePerShard,
              afterKeys,
              returnScores: true,
              refresh,
            });

          if (result.errors.length) {
            return siemResponse.error({
              statusCode: 500,
              body: {
                message: 'Error calculating the risk score for an entity.',
                full_error: JSON.stringify(result.errors),
              },
              bypassErrorFormat: true,
            });
          }

          if (result.scores_written > 0) {
            await riskScoreService.scheduleLatestTransformNow();
          }

          const score =
            result.scores_written === 1 ? result.scores?.[identifierType]?.[0] : undefined;

          return response.ok({
            body: {
              success: true,
              score,
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
      })
    );
};
