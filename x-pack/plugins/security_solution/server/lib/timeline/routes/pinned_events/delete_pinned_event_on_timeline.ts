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
import { NOTE_URL } from '../../../../../common/constants';
import { transformError, buildSiemResponse } from '../../../detection_engine/routes/utils';
import { buildFrameworkRequest } from '../../utils/common';
import { deletePinnedEventOnTimeline } from '../../saved_object/pinned_events';

export const deletPinnedEventOnTimelineRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.delete(
    {
      path: NOTE_URL,
      validate: {
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
        const { pinnedEventIds } = request.body;

        await deletePinnedEventOnTimeline(frameworkRequest, pinnedEventIds);
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
