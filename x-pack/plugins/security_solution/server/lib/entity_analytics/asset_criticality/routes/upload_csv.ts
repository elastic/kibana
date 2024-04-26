/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { schema } from '@kbn/config-schema';
import Papa from 'papaparse';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { AssetCriticalityCsvUploadResponse } from '../../../../../common/api/entity_analytics';
import { CRITICALITY_CSV_MAX_SIZE_BYTES_WITH_TOLERANCE } from '../../../../../common/entity_analytics/asset_criticality';
import type { ConfigType } from '../../../../config';
import type { HapiReadableStream } from '../../../../types';
import {
  ASSET_CRITICALITY_CSV_UPLOAD_URL,
  APP_ID,
  ENABLE_ASSET_CRITICALITY_SETTING,
} from '../../../../../common/constants';
import { checkAndInitAssetCriticalityResources } from '../check_and_init_asset_criticality_resources';
import { transformCSVToUpsertRecords } from '../transform_csv_to_upsert_records';
import { createAssetCriticalityProcessedFileEvent } from '../../../telemetry/event_based/events';
import { assertAdvancedSettingsEnabled } from '../../utils/assert_advanced_setting_enabled';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { AssetCriticalityAuditActions } from '../audit';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../../audit';

export const assetCriticalityCSVUploadRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  config: ConfigType,
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices']
) => {
  const { errorRetries, maxBulkRequestBodySizeBytes } =
    config.entityAnalytics.assetCriticality.csvUpload;
  router.versioned
    .post({
      access: 'internal',
      path: ASSET_CRITICALITY_CSV_UPLOAD_URL,
      options: {
        tags: ['access:securitySolution', `access:${APP_ID}-entity-analytics`],
        body: {
          output: 'stream',
          accepts: 'multipart/form-data',
          maxBytes: CRITICALITY_CSV_MAX_SIZE_BYTES_WITH_TOLERANCE,
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.object({
              file: schema.stream(),
            }),
          },
        },
      },
      async (context, request, response) => {
        const securitySolution = await context.securitySolution;
        securitySolution.getAuditLogger()?.log({
          message: 'User attempted to assign many asset criticalities via file upload',
          event: {
            action: AssetCriticalityAuditActions.ASSET_CRITICALITY_BULK_UPDATE,
            category: AUDIT_CATEGORY.DATABASE,
            type: AUDIT_TYPE.CREATION,
            outcome: AUDIT_OUTCOME.UNKNOWN,
          },
        });

        const start = new Date();
        const siemResponse = buildSiemResponse(response);
        const [coreStart] = await getStartServices();
        const telemetry = coreStart.analytics;

        try {
          await assertAdvancedSettingsEnabled(await context.core, ENABLE_ASSET_CRITICALITY_SETTING);
          await checkAndInitAssetCriticalityResources(context, logger);
          const assetCriticalityClient = securitySolution.getAssetCriticalityDataClient();
          const fileStream = request.body.file as HapiReadableStream;

          logger.debug(`Parsing asset criticality CSV file ${fileStream.hapi.filename}`);

          const csvStream = Papa.parse(Papa.NODE_STREAM_INPUT, {
            header: false,
            dynamicTyping: true,
            skipEmptyLines: true,
          });

          const recordsStream = fileStream.pipe(csvStream).pipe(transformCSVToUpsertRecords());

          const { errors, stats } = await assetCriticalityClient.bulkUpsertFromStream({
            recordsStream,
            retries: errorRetries,
            flushBytes: maxBulkRequestBodySizeBytes,
          });
          const end = new Date();

          const tookMs = end.getTime() - start.getTime();
          logger.debug(
            `Asset criticality CSV upload completed in ${tookMs}ms ${JSON.stringify(stats)}`
          );

          // type assignment here to ensure that the response body stays in sync with the API schema
          const resBody: AssetCriticalityCsvUploadResponse = { errors, stats };

          const [eventType, event] = createAssetCriticalityProcessedFileEvent({
            startTime: start,
            endTime: end,
            result: stats,
          });

          telemetry.reportEvent(eventType, event);

          return response.ok({ body: resBody });
        } catch (e) {
          logger.error(`Error during asset criticality csv upload: ${e}`);
          try {
            const end = new Date();

            const [eventType, event] = createAssetCriticalityProcessedFileEvent({
              startTime: start,
              endTime: end,
            });

            telemetry.reportEvent(eventType, event);
          } catch (error) {
            logger.error(`Error reporting telemetry event: ${error}`);
          }

          const error = transformError(e);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
