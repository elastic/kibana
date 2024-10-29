/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { GetAssetCriticalityStatusResponse } from '../../../../../common/api/entity_analytics';
import {
  ASSET_CRITICALITY_INTERNAL_STATUS_URL,
  APP_ID,
  API_VERSIONS,
} from '../../../../../common/constants';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../../audit';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { AssetCriticalityAuditActions } from '../audit';
import { checkAndInitAssetCriticalityResources } from '../check_and_init_asset_criticality_resources';

export const assetCriticalityInternalStatusRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .get({
      access: 'internal',
      path: ASSET_CRITICALITY_INTERNAL_STATUS_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      { version: API_VERSIONS.internal.v1, validate: {} },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<GetAssetCriticalityStatusResponse>> => {
        const siemResponse = buildSiemResponse(response);
        try {
          await checkAndInitAssetCriticalityResources(context, logger);

          const securitySolution = await context.securitySolution;
          const assetCriticalityClient = securitySolution.getAssetCriticalityDataClient();

          const result = await assetCriticalityClient.getStatus();

          securitySolution.getAuditLogger()?.log({
            message: 'User checked the status of the asset criticality service',
            event: {
              action: AssetCriticalityAuditActions.ASSET_CRITICALITY_STATUS_GET,
              category: AUDIT_CATEGORY.DATABASE,
              type: AUDIT_TYPE.ACCESS,
              outcome: AUDIT_OUTCOME.UNKNOWN,
            },
          });

          return response.ok({
            body: {
              asset_criticality_resources_installed: result.isAssetCriticalityResourcesInstalled,
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
