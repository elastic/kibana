/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { IKibanaResponse } from '@kbn/core/server';
import type { SecuritySolutionPluginRouter } from '../../../../../types';

import { TIMELINE_URL } from '../../../../../../common/constants';

import { buildRouteValidationWithExcess } from '../../../../../utils/build_validation/route_validation';
import type { ConfigType } from '../../../../..';

import { buildSiemResponse } from '../../../../detection_engine/routes/utils';

import { patchTimelineSchema } from '../../../../../../common/api/timeline';
import { buildFrameworkRequest, TimelineStatusActions } from '../../../utils/common';
import { createTimelines } from '../create_timelines';
import { CompareTimelinesStatus } from '../../../utils/compare_timelines_status';
import type { PatchTimelinesResponse } from '../../../../../../common/api/timeline';

export const patchTimelinesRoute = (router: SecuritySolutionPluginRouter, _: ConfigType) => {
  router.versioned
    .patch({
      path: TIMELINE_URL,
      options: {
        tags: ['access:securitySolution'],
      },
      access: 'public',
    })
    .addVersion(
      {
        validate: {
          request: { body: buildRouteValidationWithExcess(patchTimelineSchema) },
        },
        version: '2023-10-31',
      },
      async (context, request, response): Promise<IKibanaResponse<PatchTimelinesResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const frameworkRequest = await buildFrameworkRequest(context, request);
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
