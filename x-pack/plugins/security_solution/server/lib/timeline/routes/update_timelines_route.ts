/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../src/core/server';

import { TIMELINE_URL } from '../../../../common/constants';
import { TimelineType } from '../../../../common/types/timeline';

import { SetupPlugins } from '../../../plugin';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { ConfigType } from '../../..';

import { transformError, buildSiemResponse } from '../../detection_engine/routes/utils';
import { FrameworkRequest } from '../../framework';

import { updateTimelineSchema } from './schemas/update_timelines_schema';
import { buildFrameworkRequest } from './utils/common';
import { createTimelines, getTimeline, getTemplateTimeline } from './utils/create_timelines';
import { checkIsFailureCases } from './utils/update_timelines';

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
        const { templateTimelineId, templateTimelineVersion, timelineType } = timeline;
        const isHandlingTemplateTimeline = timelineType === TimelineType.template;
        const existTimeline =
          timelineId != null ? await getTimeline(frameworkRequest, timelineId) : null;

        const existTemplateTimeline =
          templateTimelineId != null
            ? await getTemplateTimeline(frameworkRequest, templateTimelineId)
            : null;

        const errorObj = checkIsFailureCases(
          isHandlingTemplateTimeline,
          version,
          templateTimelineVersion ?? null,
          existTimeline,
          existTemplateTimeline
        );
        if (errorObj != null) {
          return siemResponse.error(errorObj);
        }
        const updatedTimeline = await createTimelines(
          (frameworkRequest as unknown) as FrameworkRequest,
          timeline,
          timelineId,
          version
        );
        return response.ok({
          body: {
            data: {
              persistTimeline: updatedTimeline,
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
