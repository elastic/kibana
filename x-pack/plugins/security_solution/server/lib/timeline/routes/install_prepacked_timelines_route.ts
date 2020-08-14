/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../src/core/server';

import { TIMELINE_PREPACKAGED_URL } from '../../../../common/constants';

import { SetupPlugins } from '../../../plugin';
import { ConfigType } from '../../../config';
import { validate } from '../../../../common/validate';

import { buildSiemResponse, transformError } from '../../detection_engine/routes/utils';

import { installPrepackagedTimelines } from './utils/install_prepacked_timelines';

import { checkTimelinesStatus } from './utils/check_timelines_status';

import { checkTimelineStatusRt } from './schemas/check_timelines_status_schema';
import { buildFrameworkRequest } from './utils/common';

export const installPrepackedTimelinesRoute = (
  router: IRouter,
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
        const prepackagedTimelineStatus = await checkTimelinesStatus(frameworkRequest);
        const [validatedprepackagedTimelineStatus, prepackagedTimelineStatusError] = validate(
          prepackagedTimelineStatus,
          checkTimelineStatusRt
        );

        if (prepackagedTimelineStatusError != null) {
          throw prepackagedTimelineStatusError;
        }

        const timelinesToInstalled =
          validatedprepackagedTimelineStatus?.timelinesToInstall.length ?? 0;
        const timelinesNotUpdated =
          validatedprepackagedTimelineStatus?.timelinesToUpdate.length ?? 0;
        let res = null;

        if (timelinesToInstalled > 0 || timelinesNotUpdated > 0) {
          res = await installPrepackagedTimelines(
            config.maxTimelineImportExportSize,
            frameworkRequest,
            true
          );
        }
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
