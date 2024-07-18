/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { Readable } from 'node:stream';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { AssetCriticalityBulkUploadResponse } from '../../../../../common/api/entity_analytics';
import { AssetCriticalityBulkUploadRequest } from '../../../../../common/api/entity_analytics';
import type { ConfigType } from '../../../../config';
import {
  ASSET_CRITICALITY_PUBLIC_BULK_UPLOAD_URL,
  APP_ID,
  ENABLE_ASSET_CRITICALITY_SETTING,
  API_VERSIONS,
} from '../../../../../common/constants';
import { checkAndInitAssetCriticalityResources } from '../check_and_init_asset_criticality_resources';
import { assertAdvancedSettingsEnabled } from '../../utils/assert_advanced_setting_enabled';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { AssetCriticalityAuditActions } from '../audit';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../../audit';

export const assetCriticalityPublicBulkUploadRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  config: ConfigType
) => {
  router.versioned
    .post({
      access: 'public',
      path: ASSET_CRITICALITY_PUBLIC_BULK_UPLOAD_URL,
      options: {
        tags: ['access:securitySolution', `access:${APP_ID}-entity-analytics`],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(AssetCriticalityBulkUploadRequest),
          },
        },
      },
      async (context, request, response) => {
        const { errorRetries, maxBulkRequestBodySizeBytes } =
          config.entityAnalytics.assetCriticality.csvUpload;
        const { records } = request.body;

        const securitySolution = await context.securitySolution;
        securitySolution.getAuditLogger()?.log({
          message: 'User attempted to assign many asset criticalities via bulk upload',
          event: {
            action: AssetCriticalityAuditActions.ASSET_CRITICALITY_BULK_UPDATE,
            category: AUDIT_CATEGORY.DATABASE,
            type: AUDIT_TYPE.CREATION,
            outcome: AUDIT_OUTCOME.UNKNOWN,
          },
        });

        const start = new Date();
        const siemResponse = buildSiemResponse(response);

        try {
          await assertAdvancedSettingsEnabled(await context.core, ENABLE_ASSET_CRITICALITY_SETTING);
          await checkAndInitAssetCriticalityResources(context, logger);
          const assetCriticalityClient = securitySolution.getAssetCriticalityDataClient();

          const formattedRecords = records.map((record) => ({
            idField: record.id_field,
            idValue: record.id_value,
            criticalityLevel: record.criticality_level,
          }));

          const recordsStream = Readable.from(formattedRecords, { objectMode: true });

          const { errors, stats } = await assetCriticalityClient.bulkUpsertFromStream({
            recordsStream,
            retries: errorRetries,
            flushBytes: maxBulkRequestBodySizeBytes,
          });
          const end = new Date();

          const tookMs = end.getTime() - start.getTime();
          logger.debug(
            () => `Asset criticality Bulk upload completed in ${tookMs}ms ${JSON.stringify(stats)}`
          );

          const resBody: AssetCriticalityBulkUploadResponse = { errors, stats };

          return response.ok({ body: resBody });
        } catch (e) {
          logger.error(`Error during asset criticality bulk upload: ${e}`);
          const error = transformError(e);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
