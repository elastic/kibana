/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CoreSetup } from 'src/core/server';
import { MAX_FILE_SIZE_BYTES } from '../common';
import { wrapError } from './error_wrapper';
import { analyzeFile } from './analyze_file';

import { analyzeFileQuerySchema } from './schemas';
import { StartDeps } from './types';

/**
 * Routes for the file upload.
 */
export function fileDataVisualizerRoutes(coreSetup: CoreSetup<StartDeps, unknown>) {
  const router = coreSetup.http.createRouter();

  /**
   * @apiGroup FileDataVisualizer
   *
   * @api {post} /internal/file_upload/analyze_file Analyze file data
   * @apiName AnalyzeFile
   * @apiDescription Performs analysis of the file data.
   *
   * @apiSchema (query) analyzeFileQuerySchema
   */
  router.post(
    {
      path: '/internal/file_data_visualizer/analyze_file',
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
}
