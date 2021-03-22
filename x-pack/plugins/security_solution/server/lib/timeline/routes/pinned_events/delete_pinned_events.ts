/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithExcess } from '../../../../utils/build_validation/route_validation';
import { ConfigType } from '../../../..';
import { deletPinnedEventsOnTimelineSchema } from '../../schemas/pinned_events/delete_pinned_events_on_timeline_schema';
import { SecuritySolutionPluginRouter } from '../../../../types';
import { SetupPlugins } from '../../../../plugin';
import { PINNED_EVENTS_URL } from '../../../../../common/constants';
import { transformError, buildSiemResponse } from '../../../detection_engine/routes/utils';
import { buildFrameworkRequest } from '../../utils/common';
import {
  deleteAllPinnedEventsOnTimeline,
  deletePinnedEventOnTimeline,
} from '../../saved_object/pinned_events';
import { deletAllPinnedEventsOnTimelineSchema } from '../../schemas/pinned_events/delete_pinned_events_by_timeline_id_schema';

export const deletPinnedEventOnTimelineRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.delete(
    {
      path: PINNED_EVENTS_URL,
      validate: {
        query: buildRouteValidationWithExcess(deletAllPinnedEventsOnTimelineSchema),
        body: buildRouteValidationWithExcess(deletPinnedEventsOnTimelineSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const frameworkRequest = await buildFrameworkRequest(context, security, request);
        const timelineId = request.query?.timelineId ?? null;
        const pinnedEventIds = request.body?.pinnedEventIds ?? null;

        // Can only provide query or body at a time
        if (
          ((pinnedEventIds == null || pinnedEventIds.length === 0) && timelineId == null) ||
          (pinnedEventIds != null && pinnedEventIds.length > 0 && timelineId != null)
        ) {
          throw new Error(`Provide query with timelineId or body with pinned event ids`);
        }

        if (pinnedEventIds != null) {
          await deletePinnedEventOnTimeline(frameworkRequest, pinnedEventIds);
        }

        if (timelineId != null) {
          await deleteAllPinnedEventsOnTimeline(frameworkRequest, timelineId);
        }

        return response.ok();
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
