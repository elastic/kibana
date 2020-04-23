/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { find } from 'lodash/fp';

import { IRouter } from '../../../../../../../src/core/server';
import { ConfigType } from '../../..';
import { transformError, buildSiemResponse } from '../../detection_engine/routes/utils';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { TIMELINE_DEFAULT_URL } from '../../../../common/constants';
import { buildFrameworkRequest } from './utils/common';
import { SetupPlugins } from '../../../plugin';
import { getAllTimeline, resetTimeline, getTimeline, persistTimeline } from '../saved_object';
import { SortFieldTimeline, Direction } from '../../../graphql/types';
import { defaultTimelinesQuerySchema } from './schemas/default_timelines_schema';
import { timelineDefaults } from '../default_timeline';

export const defaultTimelinesRoute = (
  router: IRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.get(
    {
      path: TIMELINE_DEFAULT_URL,
      validate: {
        query: buildRouteValidation(defaultTimelinesQuerySchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      try {
        const frameworkRequest = await buildFrameworkRequest(context, security, request);
        const siemResponse = buildSiemResponse(response);
        const savedObjectsClient = context.core.savedObjects.client;

        const allTimelines = await getAllTimeline(frameworkRequest, null, null, null, {
          sortField: SortFieldTimeline.updated,
          sortOrder: Direction.desc,
        });
        console.error('allTimelines', JSON.stringify(allTimelines, null, 2));

        const defaultTimeline = find(['title', ''], allTimelines.timeline);

        console.error('defaultTimeline?.savedObjectId', defaultTimeline?.savedObjectId);
        console.error('request', request);

        if (defaultTimeline?.savedObjectId) {
          if (request.query?.clean === 'true') {
            await resetTimeline(frameworkRequest, [defaultTimeline.savedObjectId]);
            const cleanedTimeline = await getTimeline(
              frameworkRequest,
              defaultTimeline.savedObjectId
            );

            return response.ok({
              body: {
                data: {
                  persistTimeline: {
                    timeline: cleanedTimeline,
                  },
                },
              },
            });
          }

          return response.ok({
            body: {
              data: {
                persistTimeline: {
                  timeline: defaultTimeline,
                },
              },
            },
          });
        }

        const newTimelineResponse = await persistTimeline(
          frameworkRequest,
          null,
          null,
          timelineDefaults
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
