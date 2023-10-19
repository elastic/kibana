/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithExcess } from '../../../../../utils/build_validation/route_validation';
import type { ConfigType } from '../../../../..';
import { cloneTimelineSchema } from '../../../../../../common/api/timeline';
import type { CloneTimelinesResponse } from '../../../../../../common/api/timeline';
import { cloneTimeline } from '../../../saved_object/timelines';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import type { SetupPlugins } from '../../../../../plugin';
import { TIMELINE_CLONE_URL } from '../../../../../../common/constants';
import { buildSiemResponse } from '../../../../detection_engine/routes/utils';

import { buildFrameworkRequest } from '../../../utils/common';

export const cloneTimelineRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.versioned
    .post({
      path: TIMELINE_CLONE_URL,
      options: {
        tags: ['access:securitySolution'],
      },
      access: 'public',
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: { body: buildRouteValidationWithExcess(cloneTimelineSchema) },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const frameworkRequest = await buildFrameworkRequest(context, security, request);
          const { timeline, savedObjectId } = request.body;

          const clonedTimeline = await cloneTimeline(frameworkRequest, timeline, savedObjectId);
          return response.ok<CloneTimelinesResponse>({ body: { data: { clonedTimeline } } });
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
