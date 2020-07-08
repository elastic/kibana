/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../src/core/server';

import { TIMELINE_PREPACKAGED_URL } from '../../../../common/constants';

import { SetupPlugins } from '../../../plugin';
import { ConfigType } from '../../../config';
import { buildSiemResponse, transformError } from '../../detection_engine/routes/utils';

import { installPrepackagedTimelines } from './utils/install_prepacked_timelines';
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

        const res = await installPrepackagedTimelines(
          config.maxTimelineImportExportSize,
          frameworkRequest,
          true
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
