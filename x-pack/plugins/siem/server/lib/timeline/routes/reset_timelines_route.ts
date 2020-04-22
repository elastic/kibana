/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';

import { timelineSavedObjectType } from '../../../saved_objects';
import { IRouter } from '../../../../../../../src/core/server';
import { ConfigType } from '../../..';
import { transformError, buildSiemResponse } from '../../detection_engine/routes/utils';
import { TIMELINE_RESET_URL } from '../../../../common/constants';

import { resetTimelinesRequestBodySchema } from './schemas/reset_timelines_schema';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';

import { deleteNoteByTimelineId } from '../../note/routes/utils';
import { deleteAllPinnedEventsOnTimeline } from '../../pinned_event/routes/utils';
import { timelineDefaults } from '../default_timeline';

export const resetTimelinesRoute = (router: IRouter, config: ConfigType) => {
  router.post(
    {
      path: TIMELINE_RESET_URL,
      validate: {
        body: buildRouteValidation(resetTimelinesRequestBodySchema),
      },
      // options: {
      //   tags: ['access:siem'],
      // },
    },
    async (context, request, response) => {
      try {
        const siemResponse = buildSiemResponse(response);
        const savedObjectsClient = context.core.savedObjects.client;

        if (!request.body.ids.length) {
          return siemResponse.error({
            statusCode: 400,
            body: `You need to provide Timelines ids to reset`,
          });
        }

        await Promise.all(
          request.body.ids.map((timelineId: string) =>
            Promise.all([
              savedObjectsClient.update(
                timelineSavedObjectType,
                timelineId,
                omit(['title', 'description'], timelineDefaults)
              ),
              deleteNoteByTimelineId(savedObjectsClient, timelineId),
              deleteAllPinnedEventsOnTimeline(savedObjectsClient, timelineId),
            ])
          )
        );

        return response.ok({
          body: 'done',
        });
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
