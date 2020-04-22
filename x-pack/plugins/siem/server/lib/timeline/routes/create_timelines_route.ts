/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IRouter } from '../../../../../../../src/core/server';

import { TIMELINE_URL } from '../../../../common/constants';
import { TimelineType } from '../../../../common/types/timeline';

import { ConfigType } from '../../..';
import { SetupPlugins } from '../../../plugin';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';

import { transformError, buildSiemResponse } from '../../detection_engine/routes/utils';

import { createTimelineSchema } from './schemas/create_timelines_schema';
import { buildFrameworkRequest } from './utils/common';
import {
  createTimelines,
  getTimeline,
  getTemplateTimeline,
  CREATE_TEMPLATE_TIMELINE_ERROR_MESSAGE,
  CREATE_TIMELINE_ERROR_MESSAGE,
} from './utils/create_timelines';

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
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const frameworkRequest = await buildFrameworkRequest(context, security, request);

        const { timelineId, timeline, version } = request.body;
        const { templateTimelineId, timelineType } = timeline;
        const isHandlingTemplateTimeline = timelineType === TimelineType.template;

        const existTimeline =
          timelineId != null ? await getTimeline(frameworkRequest, timelineId) : null;
        const existTemplateTimeline =
          templateTimelineId != null
            ? await getTemplateTimeline(frameworkRequest, templateTimelineId)
            : null;

        if (
          (!isHandlingTemplateTimeline && existTimeline != null) ||
          (isHandlingTemplateTimeline && (existTemplateTimeline != null || existTimeline != null))
        ) {
          return siemResponse.error({
            body: isHandlingTemplateTimeline
              ? CREATE_TEMPLATE_TIMELINE_ERROR_MESSAGE
              : CREATE_TIMELINE_ERROR_MESSAGE,
            statusCode: 405,
          });
        }

        // Create timeline
        const newTimeline = await createTimelines(frameworkRequest, timeline, null, version);
        return response.ok({
          body: {
            data: {
              persistTimeline: newTimeline,
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
