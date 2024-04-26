/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { ASSET_CRITICALITY_URL, APP_ID } from '../../../../../common/constants';
import { checkAndInitAssetCriticalityResources } from '../check_and_init_asset_criticality_resources';
import { buildRouteValidationWithZod } from '../../../../utils/build_validation/route_validation';
import { CreateAssetCriticalityRecord } from '../../../../../common/api/entity_analytics/asset_criticality';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { AssetCriticalityAuditActions } from '../audit';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../../audit';
export const assetCriticalityUpsertRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .post({
      access: 'internal',
      path: ASSET_CRITICALITY_URL,
      options: {
        tags: ['access:securitySolution', `access:${APP_ID}-entity-analytics`],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(CreateAssetCriticalityRecord),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          await checkAndInitAssetCriticalityResources(context, logger);

          const securitySolution = await context.securitySolution;
          const assetCriticalityClient = securitySolution.getAssetCriticalityDataClient();

          const assetCriticalityRecord = {
            idField: request.body.id_field,
            idValue: request.body.id_value,
            criticalityLevel: request.body.criticality_level,
          };

          const result = await assetCriticalityClient.upsert(assetCriticalityRecord);

          securitySolution.getAuditLogger()?.log({
            message: 'User attempted to assign the asset criticality level for an entity',
            event: {
              action: AssetCriticalityAuditActions.ASSET_CRITICALITY_UPDATE,
              category: AUDIT_CATEGORY.DATABASE,
              type: AUDIT_TYPE.CREATION,
              outcome: AUDIT_OUTCOME.UNKNOWN,
            },
          });

          return response.ok({
            body: result,
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
