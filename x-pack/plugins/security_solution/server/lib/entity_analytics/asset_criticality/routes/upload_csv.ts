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
import type { HapiReadableStream, SecuritySolutionPluginRouter } from '../../../../types';
import { ASSET_CRITICALITY_CSV_UPLOAD_URL, APP_ID } from '../../../../../common/constants';
import { checkAndInitAssetCriticalityResources } from '../check_and_init_asset_criticality_resources';
import { transformCSVToUpsertRecords } from '../csv';
export const assetCriticalityCSVUploadRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      access: 'internal',
      path: ASSET_CRITICALITY_CSV_UPLOAD_URL,
      options: {
        tags: ['access:securitySolution', `access:${APP_ID}-entity-analytics`],
        body: {
          output: 'stream',
          accepts: 'multipart/form-data',
          maxBytes: 1024 * 1024 * 100, // 100 MB TODO: make this configurable
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
        const siemResponse = buildSiemResponse(response);
        try {
          await checkAndInitAssetCriticalityResources(context, logger);
          const securitySolution = await context.securitySolution;
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
            batchSize: 100,
          });

          return response.ok({ body: { errors, stats } });
        } catch (error) {
          logger.error(`Error during asset criticality csv upload: ${error}`);
          return siemResponse.error({ statusCode: 500 });
        }
      }
    );
};
