/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { validate } from '@kbn/securitysolution-io-ts-utils';
import type { SecuritySolutionPluginRouter } from '../../../../../types';

import { TIMELINE_PREPACKAGED_URL } from '../../../../../../common/constants';

import type { SetupPlugins } from '../../../../../plugin';
import type { ConfigType } from '../../../../../config';

import { buildSiemResponse } from '../../../../detection_engine/routes/utils';

import { installPrepackagedTimelines } from './helpers';

import { checkTimelinesStatus, checkTimelineStatusRt } from '../../../utils/check_timelines_status';

import { buildFrameworkRequest } from '../../../utils/common';

export { installPrepackagedTimelines } from './helpers';

export const installPrepackedTimelinesRoute = (
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
