/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { deleteTimeline } from '../saved_object';
import { IRouter } from '../../../../../../../src/core/server';
import { TIMELINE_URL } from '../../../../common/constants';
import { SetupPlugins } from '../../../plugin';
import { buildSiemResponse, transformError } from '../../detection_engine/routes/utils';
import { buildFrameworkRequest } from './utils/common';
import { ConfigType } from '../../../config';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';

import { deleteTimelinesRequestBodySchema } from './schemas/delete_timelines_schema';
import { getTimelines } from './utils/get_timelines';

export const deleteTimelinesRoute = (
  router: IRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.delete(
    {
      path: TIMELINE_URL,
      validate: {
        body: buildRouteValidation(deleteTimelinesRequestBodySchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const { ids } = request.body;
      const frameworkRequest = await buildFrameworkRequest(context, security, request);
      try {
        const siemResponse = buildSiemResponse(response);
        const { timelines, error } = await getTimelines(frameworkRequest, ids);

        if (timelines != null) {
          const existingTimelineIds = timelines.map((timeline) => timeline.savedObjectId);
          if (existingTimelineIds.length > 0) {
            await deleteTimeline(frameworkRequest, existingTimelineIds);
            return response.ok({
              body: error ?? `${existingTimelineIds.join(', ')} deleted`,
            });
          } else {
            return siemResponse.error({
              body: error,
              statusCode: 404,
            });
          }
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
