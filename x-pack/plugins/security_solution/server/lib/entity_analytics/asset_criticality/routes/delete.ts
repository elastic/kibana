/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IKibanaResponse, KibanaResponseFactory, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { SecuritySolutionRequestHandlerContext } from '../../../../types';
import {
  ASSET_CRITICALITY_PUBLIC_URL,
  ASSET_CRITICALITY_INTERNAL_URL,
  APP_ID,
  ENABLE_ASSET_CRITICALITY_SETTING,
  API_VERSIONS,
} from '../../../../../common/constants';
import { DeleteAssetCriticalityRecord } from '../../../../../common/api/entity_analytics/asset_criticality';
import { checkAndInitAssetCriticalityResources } from '../check_and_init_asset_criticality_resources';
import { assertAdvancedSettingsEnabled } from '../../utils/assert_advanced_setting_enabled';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { AssetCriticalityAuditActions } from '../audit';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../../audit';

type DeleteHandler = (
  context: SecuritySolutionRequestHandlerContext,
  request: {
    query: DeleteAssetCriticalityRecord;
  },
  response: KibanaResponseFactory
) => Promise<IKibanaResponse>;

const handler: (logger: Logger) => DeleteHandler =
  (logger) => async (context, request, response) => {
    const securitySolution = await context.securitySolution;

    securitySolution.getAuditLogger()?.log({
      message: 'User attempted to un-assign asset criticality from an entity',
      event: {
        action: AssetCriticalityAuditActions.ASSET_CRITICALITY_UNASSIGN,
        category: AUDIT_CATEGORY.DATABASE,
        type: AUDIT_TYPE.DELETION,
        outcome: AUDIT_OUTCOME.UNKNOWN,
      },
    });

    const siemResponse = buildSiemResponse(response);
    try {
      await assertAdvancedSettingsEnabled(await context.core, ENABLE_ASSET_CRITICALITY_SETTING);
      await checkAndInitAssetCriticalityResources(context, logger);

      const assetCriticalityClient = securitySolution.getAssetCriticalityDataClient();
      await assetCriticalityClient.delete(
        {
          idField: request.query.id_field,
          idValue: request.query.id_value,
        },
        request.query.refresh
      );

      return response.ok();
    } catch (e) {
      const error = transformError(e);

      return siemResponse.error({
        statusCode: error.statusCode,
        body: { message: error.message, full_error: JSON.stringify(e) },
        bypassErrorFormat: true,
      });
    }
  };

export const assetCriticalityInternalDeleteRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .delete({
      access: 'internal',
      path: ASSET_CRITICALITY_INTERNAL_URL,
      options: {
        tags: ['access:securitySolution', `access:${APP_ID}-entity-analytics`],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(DeleteAssetCriticalityRecord),
          },
        },
      },
      handler(logger)
    );
};

export const assetCriticalityPublicDeleteRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .delete({
      access: 'public',
      path: ASSET_CRITICALITY_PUBLIC_URL,
      options: {
        tags: ['access:securitySolution', `access:${APP_ID}-entity-analytics`],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(DeleteAssetCriticalityRecord),
          },
        },
      },
      handler(logger)
    );
};
