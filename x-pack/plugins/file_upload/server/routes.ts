/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IScopedClusterClient } from 'kibana/server';
import { CoreSetup, Logger } from 'src/core/server';
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
import { CheckPrivilegesPayload } from '../../security/server';
import { StartDeps } from './types';

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

        const authorizationService = pluginsStart.security?.authz;
        const requiresAuthz = authorizationService?.mode.useRbacForRequest(request) ?? false;

        if (!authorizationService || !requiresAuthz) {
          return response.ok({ body: { hasImportPermission: true } });
        }

        const checkPrivilegesPayload: CheckPrivilegesPayload = {
          elasticsearch: {
            cluster: checkHasManagePipeline ? ['manage_pipeline'] : [],
            index: indexName ? { [indexName]: ['create', 'create_index'] } : {},
          },
        };
        if (checkCreateIndexPattern) {
          checkPrivilegesPayload.kibana = [
            authorizationService.actions.savedObject.get('index-pattern', 'create'),
          ];
        }

        const checkPrivileges = authorizationService.checkPrivilegesDynamicallyWithRequest(request);
        const checkPrivilegesResp = await checkPrivileges(checkPrivilegesPayload);

        return response.ok({ body: { hasImportPermission: checkPrivilegesResp.hasAllRequested } });
      } catch (e) {
        logger.warn(`Unable to check import permission, error: ${e.message}`);
        return response.ok({ body: { hasImportPermission: false } });
      }
    }
  );

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
