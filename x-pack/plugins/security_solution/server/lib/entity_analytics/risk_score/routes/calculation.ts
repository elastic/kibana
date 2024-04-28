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
  RISK_SCORE_CALCULATION_URL,
} from '../../../../../common/constants';
import { riskScoreCalculationRequestSchema } from '../../../../../common/entity_analytics/risk_engine/risk_score_calculation/request_schema';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { assetCriticalityServiceFactory } from '../../asset_criticality';
import { riskScoreServiceFactory } from '../risk_score_service';
import { getRiskInputsIndex } from '../get_risk_inputs_index';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { RiskScoreAuditActions } from '../audit';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../../audit';

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
        validate: { request: { body: buildRouteValidation(riskScoreCalculationRequestSchema) } },
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
        const esClient = coreContext.elasticsearch.client.asCurrentUser;
        const soClient = coreContext.savedObjects.client;
        const spaceId = securityContext.getSpaceId();
        const riskEngineDataClient = securityContext.getRiskEngineDataClient();
        const riskScoreDataClient = securityContext.getRiskScoreDataClient();
        const assetCriticalityDataClient = securityContext.getAssetCriticalityDataClient();
        const securityConfig = await securityContext.getConfig();
        const assetCriticalityService = assetCriticalityServiceFactory({
          assetCriticalityDataClient,
          uiSettingsClient: coreContext.uiSettings.client,
        });

        const riskScoreService = riskScoreServiceFactory({
          assetCriticalityService,
          esClient,
          logger,
          riskEngineDataClient,
          riskScoreDataClient,
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
