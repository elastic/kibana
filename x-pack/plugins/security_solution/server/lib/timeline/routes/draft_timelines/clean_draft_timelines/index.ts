/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import type { ConfigType } from '../../../../..';
import { buildSiemResponse } from '../../../../detection_engine/routes/utils';

import { TIMELINE_DRAFT_URL } from '../../../../../../common/constants';
import { buildFrameworkRequest } from '../../../utils/common';
import type { SetupPlugins } from '../../../../../plugin';
import { buildRouteValidationWithExcess } from '../../../../../utils/build_validation/route_validation';
import {
  getDraftTimeline,
  resetTimeline,
  getTimeline,
  persistTimeline,
} from '../../../saved_object/timelines';
import { draftTimelineDefaults } from '../../../utils/default_timeline';
import { cleanDraftTimelineSchema, TimelineType } from '../../../../../../common/api/timeline';

export const cleanDraftTimelinesRoute = (
  router: SecuritySolutionPluginRouter,
  _: ConfigType,
  security: SetupPlugins['security']
) => {
  router.versioned
    .post({
      path: TIMELINE_DRAFT_URL,
      options: {
        tags: ['access:securitySolution'],
      },
      access: 'public',
    })
    .addVersion(
      {
        validate: {
          request: { body: buildRouteValidationWithExcess(cleanDraftTimelineSchema) },
        },
        version: '2023-10-31',
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
              draftTimeline.savedObjectId,
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
                  templateTimelineId: uuidv4(),
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
