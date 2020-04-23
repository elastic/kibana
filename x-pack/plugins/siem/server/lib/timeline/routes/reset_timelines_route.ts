/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../src/core/server';
import { ConfigType } from '../../..';
import { transformError, buildSiemResponse } from '../../detection_engine/routes/utils';
import { TIMELINE_RESET_URL } from '../../../../common/constants';
import { SetupPlugins } from '../../../plugin';

import { resetTimelinesRequestBodySchema } from './schemas/reset_timelines_schema';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';

import { buildFrameworkRequest } from './utils/common';
import { resetTimeline } from '../saved_object';

export const resetTimelinesRoute = (
  router: IRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.post(
    {
      path: TIMELINE_RESET_URL,
      validate: {
        body: buildRouteValidation(resetTimelinesRequestBodySchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      try {
        const frameworkRequest = await buildFrameworkRequest(context, security, request);
        const siemResponse = buildSiemResponse(response);

        if (!request.body.ids.length) {
          return siemResponse.error({
            statusCode: 400,
            body: `You need to provide Timelines ids to reset`,
          });
        }

        await resetTimeline(frameworkRequest, request.body.ids);

        return response.ok({
          body: request.body.ids,
        });
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
