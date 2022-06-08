/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import path, { join, resolve } from 'path';
import { Readable } from 'stream';

import { TIMELINE_PREPACKAGED_URL } from '../../../common/constants';
import { ConfigType } from '../../config';
import { SetupPlugins } from '../../plugin';
import { SecuritySolutionPluginRouter } from '../../types';
import { FrameworkRequest } from '../framework';
import { buildFrameworkRequest, getReadables, loadData } from '../timeline/utils/common';

export const installPrepackagedDashboards = async (
  maxTimelineImportExportSize: number,
  frameworkRequest: FrameworkRequest,
  isImmutable: boolean,
  filePath?: string,
  fileName?: string
): Promise<ImportTimelineResultSchema | Error> => {
  let readStream;
  const dir = resolve(
    join(__dirname, filePath ?? '../../../../detection_engine/rules/prepackaged_timelines')
  );
  const file = fileName ?? 'index.ndjson';
  const dataPath = path.join(dir, file);
  try {
    readStream = await getReadables(dataPath);
  } catch (err) {
    return {
      success: false,
      success_count: 0,
      timelines_installed: 0,
      timelines_updated: 0,
      errors: [
        {
          error: { message: `read prepackaged timelines error: ${err.message}`, status_code: 500 },
        },
      ],
    };
  }
  return loadData<null, ImportTimelineResultSchema>(readStream, <T>(docs: T) =>
    docs instanceof Readable
      ? importDashboards(docs, maxTimelineImportExportSize, frameworkRequest, isImmutable)
      : Promise.reject(new Error(`read prepackaged timelines error`))
  );
};

export const installPrepackedDashboardRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.post(
    {
      path: `${TIMELINE_PREPACKAGED_URL}`,
      validate: {},
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
        const frameworkRequest = await buildFrameworkRequest(context, security, request);

        let res = null;

        res = await installPrepackagedDashboards(
          config.maxTimelineImportExportSize,
          frameworkRequest,
          true
        );

        if (res instanceof Error) {
          throw res;
        } else {
          return response.ok({
            body: res ?? {
              success: true,
              success_count: 0,
              timelines_installed: 0,
              timelines_updated: 0,
              errors: [],
            },
          });
        }
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
