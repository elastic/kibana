/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../src/core/server';

import { TIMELINE_URL } from '../../../../common/constants';

import { SetupPlugins } from '../../../plugin';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { ConfigType } from '../../..';

import { transformError, buildSiemResponse } from '../../detection_engine/routes/utils';

import { updateTimelineSchema } from './schemas/update_timelines_schema';
import { buildFrameworkRequest, TimelineStatusActions } from './utils/common';
import { createTimelines } from './utils/create_timelines';
import { CompareTimelinesStatus } from './utils/compare_timelines_status';

export const updateTimelinesRoute = (
  router: IRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.patch(
    {
      path: TIMELINE_URL,
      validate: {
        body: buildRouteValidation(updateTimelineSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    // eslint-disable-next-line complexity
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const frameworkRequest = await buildFrameworkRequest(context, security, request);
        const { timelineId, timeline, version } = request.body;
        const {
          templateTimelineId,
          templateTimelineVersion,
          timelineType,
          title,
          status,
        } = timeline;

        const compareTimelinesStatus = new CompareTimelinesStatus({
          status,
          title,
          timelineType,
          timelineInput: {
            id: timelineId,
            version,
          },
          templateTimelineInput: {
            id: templateTimelineId,
            version: templateTimelineVersion,
          },
          frameworkRequest,
        });

        await compareTimelinesStatus.init();
        if (compareTimelinesStatus.isUpdatable) {
          const updatedTimeline = await createTimelines({
            frameworkRequest,
            timeline,
            timelineSavedObjectId: timelineId,
            timelineVersion: version,
          });

          return response.ok({
            body: {
              data: {
                persistTimeline: updatedTimeline,
              },
            },
          });
        } else {
          const error = compareTimelinesStatus.checkIsFailureCases(TimelineStatusActions.update);
          return siemResponse.error(
            error || {
              statusCode: 405,
              body: 'update timeline error',
            }
          );
        }
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
