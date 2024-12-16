/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core-http-server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  CopyTimelineRequestBody,
  type CopyTimelineResponse,
} from '../../../../../../common/api/timeline';
import { copyTimeline } from '../../../saved_object/timelines';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { TIMELINE_COPY_URL } from '../../../../../../common/constants';
import { buildSiemResponse } from '../../../../detection_engine/routes/utils';

import { buildFrameworkRequest } from '../../../utils/common';

export const copyTimelineRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      path: TIMELINE_COPY_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { body: buildRouteValidationWithZod(CopyTimelineRequestBody) },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<CopyTimelineResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const frameworkRequest = await buildFrameworkRequest(context, request);
          const { timeline, timelineIdToCopy } = request.body;
          const copiedTimeline = await copyTimeline(frameworkRequest, timeline, timelineIdToCopy);

          if (copiedTimeline.code === 200) {
            return response.ok({
              body: copiedTimeline.timeline,
            });
          } else {
            return siemResponse.error({
              body: copiedTimeline.message,
              statusCode: copiedTimeline.code,
            });
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
