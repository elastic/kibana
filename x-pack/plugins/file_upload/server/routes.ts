/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter, IScopedClusterClient } from 'kibana/server';
import {
  MAX_FILE_SIZE_BYTES,
  IngestPipelineWrapper,
  InputData,
  Mappings,
  Settings,
} from '../common';
import { wrapError } from './error_wrapper';
import { analyzeFile } from './analyze_file';
import { importDataProvider } from './import_data';

import { updateTelemetry } from './telemetry';
import { analyzeFileQuerySchema, importFileBodySchema, importFileQuerySchema } from './schemas';

function importData(
  client: IScopedClusterClient,
  id: string | undefined,
  index: string,
  settings: Settings,
  mappings: Mappings,
  ingestPipeline: IngestPipelineWrapper,
  data: InputData
) {
  const { importData: importDataFunc } = importDataProvider(client);
  return importDataFunc(id, index, settings, mappings, ingestPipeline, data);
}

/**
 * Routes for the file upload.
 */
export function fileUploadRoutes(router: IRouter) {
  /**
   * @apiGroup FileDataVisualizer
   *
   * @api {post} /api/file_upload/analyze_file Analyze file data
   * @apiName AnalyzeFile
   * @apiDescription Performs analysis of the file data.
   *
   * @apiSchema (query) analyzeFileQuerySchema
   */
  router.post(
    {
      path: '/api/file_upload/analyze_file',
      validate: {
        body: schema.any(),
        query: analyzeFileQuerySchema,
      },
      options: {
        body: {
          accepts: ['text/*', 'application/json'],
          maxBytes: MAX_FILE_SIZE_BYTES,
        },
        tags: ['access:fileUpload:analyzeFile'],
      },
    },
    async (context, request, response) => {
      try {
        const result = await analyzeFile(
          context.core.elasticsearch.client,
          request.body,
          request.query
        );
        return response.ok({ body: result });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    }
  );

  /**
   * @apiGroup FileDataVisualizer
   *
   * @api {post} /api/file_upload/import Import file data
   * @apiName ImportFile
   * @apiDescription Imports file data into elasticsearch index.
   *
   * @apiSchema (query) importFileQuerySchema
   * @apiSchema (body) importFileBodySchema
   */
  router.post(
    {
      path: '/api/file_upload/import',
      validate: {
        query: importFileQuerySchema,
        body: importFileBodySchema,
      },
      options: {
        body: {
          accepts: ['application/json'],
          maxBytes: MAX_FILE_SIZE_BYTES,
        },
        tags: ['access:fileUpload:import'],
      },
    },
    async (context, request, response) => {
      try {
        const { id } = request.query;
        const { index, data, settings, mappings, ingestPipeline } = request.body;

        // `id` being `undefined` tells us that this is a new import due to create a new index.
        // follow-up import calls to just add additional data will include the `id` of the created
        // index, we'll ignore those and don't increment the counter.
        if (id === undefined) {
          await updateTelemetry();
        }

        const result = await importData(
          context.core.elasticsearch.client,
          id,
          index,
          settings,
          mappings,
          // @ts-expect-error
          ingestPipeline,
          data
        );
        return response.ok({ body: result });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    }
  );
}
