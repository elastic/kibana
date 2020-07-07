/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter } from '../../../../../../../src/core/server';

import { TIMELINE_URL } from '../../../../common/constants';

import { ConfigType } from '../../..';
import { SetupPlugins } from '../../../plugin';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';

import { transformError, buildSiemResponse } from '../../detection_engine/routes/utils';

import { createTimelineSchema } from './schemas/create_timelines_schema';
import {
  buildFrameworkRequest,
  CompareTimelinesStatus,
  TimelineStatusActions,
} from './utils/common';
import { createTimelines } from './utils/create_timelines';

export const createTimelinesRoute = (
  router: IRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.post(
    {
      path: TIMELINE_URL,
      validate: {
        body: buildRouteValidation(createTimelineSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
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

        // Create timeline
        if (compareTimelinesStatus.isCreatable) {
          const newTimeline = await createTimelines({
            frameworkRequest,
            timeline,
            timelineVersion: version,
          });

          return response.ok({
            body: {
              data: {
                persistTimeline: newTimeline,
              },
            },
          });
        } else {
          return siemResponse.error(
            compareTimelinesStatus.checkIsFailureCases(TimelineStatusActions.create) || {
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
