/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../src/core/server';
import { ConfigType } from '../../..';
import { transformError, buildSiemResponse } from '../../detection_engine/routes/utils';
import { TIMELINE_DRAFT_URL } from '../../../../common/constants';
import { buildFrameworkRequest } from './utils/common';
import { SetupPlugins } from '../../../plugin';
import { getDraftTimeline, resetTimeline, getTimeline, persistTimeline } from '../saved_object';
import { draftTimelineDefaults } from '../default_timeline';

export const cleanDraftTimelinesRoute = (
  router: IRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.post(
    {
      path: TIMELINE_DRAFT_URL,
      validate: {},
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const frameworkRequest = await buildFrameworkRequest(context, security, request);
      const siemResponse = buildSiemResponse(response);

      try {
        const {
          timeline: [draftTimeline],
        } = await getDraftTimeline(frameworkRequest);

        if (draftTimeline?.savedObjectId) {
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

        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
