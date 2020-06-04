/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../src/core/server';
import { ConfigType } from '../../..';
import { transformError, buildSiemResponse } from '../../detection_engine/routes/utils';
import { TIMELINE_URL } from '../../../../common/constants';
import { buildFrameworkRequest } from './utils/common';
import { SetupPlugins } from '../../../plugin';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { getAllTimeline } from '../saved_object';
import { getTimelinesRequestQuerySchema } from './schemas/get_timelines_schemas';
import { getTimelines } from './utils/get_timelines';

export const getTimelinesRoute = (
  router: IRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.get(
    {
      path: TIMELINE_URL,
      validate: { query: buildRouteValidation(getTimelinesRequestQuerySchema) },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const frameworkRequest = await buildFrameworkRequest(context, security, request);
      const siemResponse = buildSiemResponse(response);
      const { id } = request.query;

      try {
        let timelines;
        let error;
        if (id != null) {
          timelines = await getTimelines(frameworkRequest, id.split(','));
          error = timelines.error;
        } else {
          timelines = await getAllTimeline(frameworkRequest, null, null, null, null, null);
        }

        return response.ok({
          body: {
            data: {
              persistTimeline: timelines,
              error,
            },
          },
        });
      } catch (err) {
        const error = transformError(err);

        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
