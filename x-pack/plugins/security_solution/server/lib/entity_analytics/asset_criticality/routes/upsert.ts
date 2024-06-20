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
import { checkAndInitAssetCriticalityResources } from '../check_and_init_asset_criticality_resources';
import { CreateSingleAssetCriticalityRequest } from '../../../../../common/api/entity_analytics';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { AssetCriticalityAuditActions } from '../audit';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../../audit';
import { assertAdvancedSettingsEnabled } from '../../utils/assert_advanced_setting_enabled';

type UpsertHandler = (
  context: SecuritySolutionRequestHandlerContext,
  request: {
    body: CreateSingleAssetCriticalityRequest;
  },
  response: KibanaResponseFactory
) => Promise<IKibanaResponse>;

const handler: (logger: Logger) => UpsertHandler =
  (logger) => async (context, request, response) => {
    const siemResponse = buildSiemResponse(response);
    try {
      await assertAdvancedSettingsEnabled(await context.core, ENABLE_ASSET_CRITICALITY_SETTING);
      await checkAndInitAssetCriticalityResources(context, logger);

      const securitySolution = await context.securitySolution;
      const assetCriticalityClient = securitySolution.getAssetCriticalityDataClient();

      const assetCriticalityRecord = {
        idField: request.body.id_field,
        idValue: request.body.id_value,
        criticalityLevel: request.body.criticality_level,
      };

      const result = await assetCriticalityClient.upsert(
        assetCriticalityRecord,
        request.body.refresh
      );

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
  };

export const assetCriticalityInternalUpsertRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .post({
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
            body: buildRouteValidationWithZod(CreateSingleAssetCriticalityRequest),
          },
        },
      },
      handler(logger)
    );
};

export const assetCriticalityPublicUpsertRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .post({
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
            body: buildRouteValidationWithZod(CreateSingleAssetCriticalityRequest),
          },
        },
      },
      handler(logger)
    );
};
