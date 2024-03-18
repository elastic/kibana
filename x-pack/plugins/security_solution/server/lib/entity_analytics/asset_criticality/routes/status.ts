/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { AssetCriticalityStatusResponse } from '../../../../../common/api/entity_analytics/asset_criticality';
import {
  ASSET_CRITICALITY_STATUS_URL,
  APP_ID,
  ENABLE_ASSET_CRITICALITY_SETTING,
} from '../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { assertAdvancedSettingsEnabled } from '../../utils/assert_advanced_setting_enabled';
import { checkAndInitAssetCriticalityResources } from '../check_and_init_asset_criticality_resources';

export const assetCriticalityStatusRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      access: 'internal',
      path: ASSET_CRITICALITY_STATUS_URL,
      options: {
        tags: ['access:securitySolution', `access:${APP_ID}-entity-analytics`],
      },
    })
    .addVersion({ version: '1', validate: {} }, async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        await assertAdvancedSettingsEnabled(await context.core, ENABLE_ASSET_CRITICALITY_SETTING);
        await checkAndInitAssetCriticalityResources(context, logger);

        const securitySolution = await context.securitySolution;
        const assetCriticalityClient = securitySolution.getAssetCriticalityDataClient();

        const result = await assetCriticalityClient.getStatus();
        const body: AssetCriticalityStatusResponse = {
          asset_criticality_resources_installed: result.isAssetCriticalityResourcesInstalled,
        };
        return response.ok({
          body,
        });
      } catch (e) {
        const error = transformError(e);

        return siemResponse.error({
          statusCode: error.statusCode,
          body: { message: error.message, full_error: JSON.stringify(e) },
          bypassErrorFormat: true,
        });
      }
    });
};
