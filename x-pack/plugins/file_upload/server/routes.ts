/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IScopedClusterClient } from 'kibana/server';
import { CoreSetup, Logger } from 'src/core/server';
import { MAX_FILE_SIZE_BYTES } from '../common/constants';
import type { IngestPipelineWrapper, InputData, Mappings, Settings } from '../common/types';
import { wrapError } from './error_wrapper';
import { importDataProvider } from './import_data';
import { getTimeFieldRange } from './get_time_field_range';
import { analyzeFile } from './analyze_file';

import { updateTelemetry } from './telemetry';
import {
  importFileBodySchema,
  importFileQuerySchema,
  analyzeFileQuerySchema,
  runtimeMappingsSchema,
} from './schemas';
import { StartDeps } from './types';
import { checkFileUploadPrivileges } from './check_privileges';

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
export function fileUploadRoutes(coreSetup: CoreSetup<StartDeps, unknown>, logger: Logger) {
  const router = coreSetup.http.createRouter();

  router.get(
    {
      path: '/internal/file_upload/has_import_permission',
      validate: {
        query: schema.object({
          indexName: schema.maybe(schema.string()),
          checkCreateIndexPattern: schema.boolean(),
          checkHasManagePipeline: schema.boolean(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const [, pluginsStart] = await coreSetup.getStartServices();
        const { indexName, checkCreateIndexPattern, checkHasManagePipeline } = request.query;

        const { hasImportPermission } = await checkFileUploadPrivileges({
          authorization: pluginsStart.security?.authz,
          request,
          indexName,
          checkCreateIndexPattern,
          checkHasManagePipeline,
        });

        return response.ok({ body: { hasImportPermission } });
      } catch (e) {
        logger.warn(`Unable to check import permission, error: ${e.message}`);
        return response.ok({ body: { hasImportPermission: false } });
      }
    }
  );

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

  /**
   * @apiGroup FileDataVisualizer
   *
   * @api {post} /internal/file_upload/import Import file data
   * @apiName ImportFile
   * @apiDescription Imports file data into elasticsearch index.
   *
   * @apiSchema (query) importFileQuerySchema
   * @apiSchema (body) importFileBodySchema
   */
  router.post(
    {
      path: '/internal/file_upload/import',
      validate: {
        query: importFileQuerySchema,
        body: importFileBodySchema,
      },
      options: {
        body: {
          accepts: ['application/json'],
          maxBytes: MAX_FILE_SIZE_BYTES,
        },
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

  /**
   * @apiGroup FileDataVisualizer
   *
   * @api {post} /internal/file_upload/index_exists ES indices exists wrapper checks if index exists
   * @apiName IndexExists
   */
  router.post(
    {
      path: '/internal/file_upload/index_exists',
      validate: {
        body: schema.object({ index: schema.string() }),
      },
    },
    async (context, request, response) => {
      try {
        const indexExists = await context.core.elasticsearch.client.asCurrentUser.indices.exists(
          request.body
        );
        return response.ok({ body: { exists: indexExists } });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    }
  );

  /**
   * @apiGroup FileDataVisualizer
   *
   * @api {post} /internal/file_upload/time_field_range Get time field range
   * @apiName GetTimeFieldRange
   * @apiDescription Returns the time range for the given index and query using the specified time range.
   *
   * @apiSchema (body) getTimeFieldRangeSchema
   *
   * @apiSuccess {Object} start start of time range with epoch and string properties.
   * @apiSuccess {Object} end end of time range with epoch and string properties.
   */
  router.post(
    {
      path: '/internal/file_upload/time_field_range',
      validate: {
        body: schema.object({
          /** Index or indexes for which to return the time range. */
          index: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
          /** Name of the time field in the index. */
          timeFieldName: schema.string(),
          /** Query to match documents in the index(es). */
          query: schema.maybe(schema.any()),
          runtimeMappings: schema.maybe(runtimeMappingsSchema),
        }),
      },
      options: {
        tags: ['access:fileUpload:analyzeFile'],
      },
    },
    async (context, request, response) => {
      try {
        const { index, timeFieldName, query, runtimeMappings } = request.body;
        const resp = await getTimeFieldRange(
          context.core.elasticsearch.client,
          index,
          timeFieldName,
          query,
          runtimeMappings
        );

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    }
  );
}
