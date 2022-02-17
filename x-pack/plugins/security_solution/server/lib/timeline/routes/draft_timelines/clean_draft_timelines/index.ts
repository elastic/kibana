/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { ConfigType } from '../../../../..';
import { buildSiemResponse } from '../../../../detection_engine/routes/utils';

import { TIMELINE_DRAFT_URL } from '../../../../../../common/constants';
import { buildFrameworkRequest } from '../../../utils/common';
import { SetupPlugins } from '../../../../../plugin';
import { buildRouteValidationWithExcess } from '../../../../../utils/build_validation/route_validation';
import {
  getDraftTimeline,
  resetTimeline,
  getTimeline,
  persistTimeline,
} from '../../../saved_object/timelines';
import { draftTimelineDefaults } from '../../../utils/default_timeline';
import { cleanDraftTimelineSchema } from '../../../schemas/draft_timelines';
import { TimelineType } from '../../../../../../common/types/timeline';

export const cleanDraftTimelinesRoute = (
  router: SecuritySolutionPluginRouter,
  _: ConfigType,
  security: SetupPlugins['security']
) => {
  router.post(
    {
      path: TIMELINE_DRAFT_URL,
      validate: {
        body: buildRouteValidationWithExcess(cleanDraftTimelineSchema),
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
