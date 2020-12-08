/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IScopedClusterClient } from 'kibana/server';
import { MAX_FILE_SIZE_BYTES } from '../../common/constants/file_datavisualizer';
import {
  InputOverrides,
  Settings,
  IngestPipelineWrapper,
  Mappings,
} from '../../common/types/file_datavisualizer';
import { wrapError } from '../client/error_wrapper';
import {
  InputData,
  fileDataVisualizerProvider,
  importDataProvider,
} from '../models/file_data_visualizer';

import { RouteInitialization } from '../types';
import { updateTelemetry } from '../lib/telemetry';
import {
  analyzeFileQuerySchema,
  importFileBodySchema,
  importFileQuerySchema,
} from './schemas/file_data_visualizer_schema';
import type { MlClient } from '../lib/ml_client';

function analyzeFiles(mlClient: MlClient, data: InputData, overrides: InputOverrides) {
  const { analyzeFile } = fileDataVisualizerProvider(mlClient);
  return analyzeFile(data, overrides);
}

function importData(
  client: IScopedClusterClient,
  id: string,
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
 * Routes for the file data visualizer.
 */
export function fileDataVisualizerRoutes({ router, routeGuard }: RouteInitialization) {
  /**
   * @apiGroup FileDataVisualizer
   *
   * @api {post} /api/ml/file_data_visualizer/analyze_file Analyze file data
   * @apiName AnalyzeFile
   * @apiDescription Performs analysis of the file data.
   *
   * @apiSchema (query) analyzeFileQuerySchema
   */
  router.post(
    {
      path: '/api/ml/file_data_visualizer/analyze_file',
      validate: {
        body: schema.any(),
        query: analyzeFileQuerySchema,
      },
      options: {
        body: {
          accepts: ['text/*', 'application/json'],
          maxBytes: MAX_FILE_SIZE_BYTES,
        },
        tags: ['access:ml:canFindFileStructure'],
      },
    },
    routeGuard.basicLicenseAPIGuard(async ({ mlClient, request, response }) => {
      try {
        const result = await analyzeFiles(mlClient, request.body, request.query);
        return response.ok({ body: result });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup FileDataVisualizer
   *
   * @api {post} /api/ml/file_data_visualizer/import Import file data
   * @apiName ImportFile
   * @apiDescription Imports file data into elasticsearch index.
   *
   * @apiSchema (query) importFileQuerySchema
   * @apiSchema (body) importFileBodySchema
   */
  router.post(
    {
      path: '/api/ml/file_data_visualizer/import',
      validate: {
        query: importFileQuerySchema,
        body: importFileBodySchema,
      },
      options: {
        body: {
          accepts: ['application/json'],
          maxBytes: MAX_FILE_SIZE_BYTES,
        },
        tags: ['access:ml:canFindFileStructure'],
      },
    },
    routeGuard.basicLicenseAPIGuard(async ({ client, request, response }) => {
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
          client,
          id,
          index,
          settings,
          mappings,
          ingestPipeline,
          data
        );
        return response.ok({ body: result });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
