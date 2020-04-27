/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../src/core/server';
import { ConfigType } from '../../..';
import { transformError, buildSiemResponse } from '../../detection_engine/routes/utils';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { TIMELINE_DRAFT_URL } from '../../../../common/constants';
import { buildFrameworkRequest } from './utils/common';
import { SetupPlugins } from '../../../plugin';
import { getDraftTimeline, resetTimeline, getTimeline, persistTimeline } from '../saved_object';
import { draftTimelinesQuerySchema } from './schemas/draft_timelines_schema';
import { draftTimelineDefaults } from '../default_timeline';
// import { TimelineType } from '../../../graphql/types';

export const draftTimelinesRoute = (
  router: IRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.get(
    {
      path: TIMELINE_DRAFT_URL,
      validate: {
        query: buildRouteValidation(draftTimelinesQuerySchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      try {
        const frameworkRequest = await buildFrameworkRequest(context, security, request);
        // const siemResponse = buildSiemResponse(response);

        const {
          timeline: [draftTimeline],
        } = await getDraftTimeline(frameworkRequest);

        if (draftTimeline?.savedObjectId) {
          if (request.query?.clean === 'true') {
            await resetTimeline(frameworkRequest, [draftTimeline.savedObjectId]);
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

          return response.ok({
            body: {
              data: {
                persistTimeline: {
                  timeline: draftTimeline,
                },
              },
            },
          });
        }

        const newTimelineResponse = await persistTimeline(
          frameworkRequest,
          null,
          null,
          draftTimelineDefaults
        );

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
        const siemResponse = buildSiemResponse(response);

        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
