/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import type { ConfigType } from '../../../../..';
import { buildSiemResponse } from '../../../../detection_engine/routes/utils';

import { TIMELINE_DRAFT_URL } from '../../../../../../common/constants';
import { buildFrameworkRequest } from '../../../utils/common';
import { buildRouteValidationWithExcess } from '../../../../../utils/build_validation/route_validation';
import { getDraftTimeline, persistTimeline } from '../../../saved_object/timelines';
import { draftTimelineDefaults } from '../../../utils/default_timeline';
import { getDraftTimelineSchema } from '../../../../../../common/api/timeline';

export const getDraftTimelinesRoute = (router: SecuritySolutionPluginRouter, _: ConfigType) => {
  router.versioned
    .get({
      path: TIMELINE_DRAFT_URL,
      options: {
        tags: ['access:securitySolution'],
      },
      access: 'public',
    })
    .addVersion(
      {
        validate: {
          request: { query: buildRouteValidationWithExcess(getDraftTimelineSchema) },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const frameworkRequest = await buildFrameworkRequest(context, request);
        const siemResponse = buildSiemResponse(response);

        try {
          const {
            timeline: [draftTimeline],
          } = await getDraftTimeline(frameworkRequest, request.query.timelineType);

          if (draftTimeline?.savedObjectId) {
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

          const newTimelineResponse = await persistTimeline(frameworkRequest, null, null, {
            ...draftTimelineDefaults,
            timelineType: request.query.timelineType,
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
