/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { extname } from 'path';

import { IRouter } from '../../../../../../../src/core/server';

import { TIMELINE_IMPORT_URL } from '../../../../common/constants';

import { SetupPlugins } from '../../../plugin';
import { ConfigType } from '../../../config';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { buildSiemResponse, transformError } from '../../detection_engine/routes/utils';

import { importTimelines } from './utils/import_timelines';
import { ImportTimelinesPayloadSchemaRt } from './schemas/import_timelines_schema';
import { buildFrameworkRequest } from './utils/common';

export const importTimelinesRoute = (
  router: IRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.post(
    {
      path: `${TIMELINE_IMPORT_URL}`,
      validate: {
        body: buildRouteValidation(ImportTimelinesPayloadSchemaRt),
      },
      options: {
        tags: ['access:securitySolution'],
        body: {
          maxBytes: config.maxTimelineImportPayloadBytes,
          output: 'stream',
        },
      },
    },
    async (context, request, response) => {
      try {
        const siemResponse = buildSiemResponse(response);
        const savedObjectsClient = context.core.savedObjects.client;
        if (!savedObjectsClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const { file, isImmutable } = request.body;
        const { filename } = file.hapi;
        const fileExtension = extname(filename).toLowerCase();

        if (fileExtension !== '.ndjson') {
          return siemResponse.error({
            statusCode: 400,
            body: `Invalid file extension ${fileExtension}`,
          });
        }

        const frameworkRequest = await buildFrameworkRequest(context, security, request);

        const res = await importTimelines(
          file,
          config.maxTimelineImportExportSize,
          frameworkRequest,
          isImmutable === 'true'
        );
        if (typeof res !== 'string') return response.ok({ body: res ?? {} });
        else throw res;
      } catch (err) {
        const error = transformError(err);
        const siemResponse = buildSiemResponse(response);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
