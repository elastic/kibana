/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { IRouter } from '../../../../../../../src/core/server';
import { ConfigType } from '../../..';
import { transformError, buildSiemResponse } from '../../detection_engine/routes/utils';
import { TIMELINE_DRAFT_URL } from '../../../../common/constants';
import { buildFrameworkRequest } from './utils/common';
import { SetupPlugins } from '../../../plugin';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { getDraftTimeline, resetTimeline, getTimeline, persistTimeline } from '../saved_object';
import { draftTimelineDefaults } from '../default_timeline';
import { cleanDraftTimelineSchema } from './schemas/clean_draft_timelines_schema';
import { TimelineType } from '../../../../common/types/timeline';

export const cleanDraftTimelinesRoute = (
  router: IRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.post(
    {
      path: TIMELINE_DRAFT_URL,
      validate: {
        body: buildRouteValidation(cleanDraftTimelineSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const frameworkRequest = await buildFrameworkRequest(context, security, request);
      const siemResponse = buildSiemResponse(response);

      try {
        const {
          timeline: [draftTimeline],
        } = await getDraftTimeline(frameworkRequest, request.body.timelineType);

        if (draftTimeline?.savedObjectId) {
          await resetTimeline(
            frameworkRequest,
            [draftTimeline.savedObjectId],
            request.body.timelineType
          );
          const cleanedDraftTimeline = await getTimeline(
            frameworkRequest,
            draftTimeline.savedObjectId
          );

          return response.ok({
            body: {
              data: {
                persistTimeline: {
                  timeline: cleanedDraftTimeline,
                },
              },
            },
          });
        }
        const templateTimelineData =
          request.body.timelineType === TimelineType.template
            ? {
                timelineType: request.body.timelineType,
                templateTimelineId: uuid.v4(),
                templateTimelineVersion: 1,
              }
            : {};

        const newTimelineResponse = await persistTimeline(frameworkRequest, null, null, {
          ...draftTimelineDefaults,
          ...templateTimelineData,
        });

        if (newTimelineResponse.code === 200) {
          return response.ok({
            body: {
              data: {
                persistTimeline: {
                  timeline: newTimelineResponse.timeline,
                },
              },
            },
          });
        }

        return response.ok({});
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
