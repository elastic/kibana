/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { SecuritySolutionPluginRouter } from '../../../../../types';

import { TIMELINE_URL } from '../../../../../../common/constants';

import { SetupPlugins } from '../../../../../plugin';
import { buildRouteValidationWithExcess } from '../../../../../utils/build_validation/route_validation';
import { ConfigType } from '../../../../..';

import { buildSiemResponse } from '../../../../detection_engine/routes/utils';

import { patchTimelineSchema } from '../../../schemas/timelines/patch_timelines_schema';
import { buildFrameworkRequest, TimelineStatusActions } from '../../../utils/common';
import { createTimelines } from '../create_timelines';
import { CompareTimelinesStatus } from '../../../utils/compare_timelines_status';

export const patchTimelinesRoute = (
  router: SecuritySolutionPluginRouter,
  _: ConfigType,
  security: SetupPlugins['security']
) => {
  router.patch(
    {
      path: TIMELINE_URL,
      validate: {
        body: buildRouteValidationWithExcess(patchTimelineSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const frameworkRequest = await buildFrameworkRequest(context, security, request);
        const { timelineId, timeline, version } = request.body;
        const { templateTimelineId, templateTimelineVersion, timelineType, title, status } =
          timeline;

        const compareTimelinesStatus = new CompareTimelinesStatus({
          status,
          title,
          timelineType,
          timelineInput: {
            id: timelineId,
            version,
          },
          templateTimelineInput: {
            id: templateTimelineId,
            version: templateTimelineVersion,
          },
          frameworkRequest,
        });

        await compareTimelinesStatus.init();
        if (compareTimelinesStatus.isUpdatable) {
          const updatedTimeline = await createTimelines({
            frameworkRequest,
            timeline,
            timelineSavedObjectId: timelineId,
            timelineVersion: version,
          });

          return response.ok({
            body: {
              data: {
                persistTimeline: updatedTimeline,
              },
            },
          });
        } else {
          const error = compareTimelinesStatus.checkIsFailureCases(TimelineStatusActions.update);
          return siemResponse.error(
            error || {
              statusCode: 405,
              body: 'update timeline error',
            }
          );
        }
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
