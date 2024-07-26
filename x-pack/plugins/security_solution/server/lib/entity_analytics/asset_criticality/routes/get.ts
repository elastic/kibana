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
import { GetAssetCriticalityRecordRequestQuery } from '../../../../../common/api/entity_analytics';
import type { SecuritySolutionRequestHandlerContext } from '../../../../types';
import {
  ASSET_CRITICALITY_INTERNAL_URL,
  ASSET_CRITICALITY_PUBLIC_URL,
  APP_ID,
  ENABLE_ASSET_CRITICALITY_SETTING,
  API_VERSIONS,
} from '../../../../../common/constants';
import { checkAndInitAssetCriticalityResources } from '../check_and_init_asset_criticality_resources';
import { assertAdvancedSettingsEnabled } from '../../utils/assert_advanced_setting_enabled';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { AssetCriticalityAuditActions } from '../audit';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../../audit';
type GetHandler = (
  context: SecuritySolutionRequestHandlerContext,
  request: {
    query: GetAssetCriticalityRecordRequestQuery;
  },
  response: KibanaResponseFactory
) => Promise<IKibanaResponse>;

const handler: (logger: Logger) => GetHandler = (logger) => async (context, request, response) => {
  const siemResponse = buildSiemResponse(response);
  try {
    await assertAdvancedSettingsEnabled(await context.core, ENABLE_ASSET_CRITICALITY_SETTING);
    await checkAndInitAssetCriticalityResources(context, logger);

    const securitySolution = await context.securitySolution;
    const assetCriticalityClient = securitySolution.getAssetCriticalityDataClient();
    const record = await assetCriticalityClient.get({
      idField: request.query.id_field,
      idValue: request.query.id_value,
    });

    if (!record) {
      return response.notFound();
    }

    securitySolution.getAuditLogger()?.log({
      message: 'User accessed the criticality level for an entity',
      event: {
        action: AssetCriticalityAuditActions.ASSET_CRITICALITY_GET,
        category: AUDIT_CATEGORY.DATABASE,
        type: AUDIT_TYPE.ACCESS,
        outcome: AUDIT_OUTCOME.SUCCESS,
      },
    });

    return response.ok({ body: record });
  } catch (e) {
    const error = transformError(e);

    return siemResponse.error({
      statusCode: error.statusCode,
      body: { message: error.message, full_error: JSON.stringify(e) },
      bypassErrorFormat: true,
    });
  }
};

export const assetCriticalityInternalGetRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .get({
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
            query: buildRouteValidationWithZod(GetAssetCriticalityRecordRequestQuery),
          },
        },
      },
      handler(logger)
    );
};

export const assetCriticalityPublicGetRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .get({
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
            query: buildRouteValidationWithZod(GetAssetCriticalityRecordRequestQuery),
          },
        },
      },
      handler(logger)
    );
};
