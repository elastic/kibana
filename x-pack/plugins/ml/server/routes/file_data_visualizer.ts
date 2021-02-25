/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { MAX_FILE_SIZE_BYTES } from '../../../file_upload/common';
import { InputOverrides } from '../../common/types/file_datavisualizer';
import { wrapError } from '../client/error_wrapper';
import { InputData, fileDataVisualizerProvider } from '../models/file_data_visualizer';

import { RouteInitialization } from '../types';
import { analyzeFileQuerySchema } from './schemas/file_data_visualizer_schema';

function analyzeFiles(client: IScopedClusterClient, data: InputData, overrides: InputOverrides) {
  const { analyzeFile } = fileDataVisualizerProvider(client);
  return analyzeFile(data, overrides);
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
    routeGuard.basicLicenseAPIGuard(async ({ client, request, response }) => {
      try {
        const result = await analyzeFiles(client, request.body, request.query);
        return response.ok({ body: result });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
