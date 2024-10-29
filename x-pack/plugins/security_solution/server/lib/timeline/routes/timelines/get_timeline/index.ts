/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { SecuritySolutionPluginRouter } from '../../../../../types';

import { TIMELINE_URL } from '../../../../../../common/constants';

import { buildSiemResponse } from '../../../../detection_engine/routes/utils';

import { buildFrameworkRequest } from '../../../utils/common';
import {
  GetTimelineRequestQuery,
  type GetTimelineResponse,
} from '../../../../../../common/api/timeline';
import { getTimelineTemplateOrNull, getTimelineOrNull } from '../../../saved_object/timelines';
import type { ResolvedTimeline, TimelineResponse } from '../../../../../../common/api/timeline';

export const getTimelineRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .get({
      path: TIMELINE_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      access: 'public',
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: { query: buildRouteValidationWithZod(GetTimelineRequestQuery) },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<GetTimelineResponse>> => {
        try {
          const frameworkRequest = await buildFrameworkRequest(context, request);
          const query = request.query ?? {};
          const { template_timeline_id: templateTimelineId, id } = query;

          let res: TimelineResponse | ResolvedTimeline | null = null;

          if (templateTimelineId != null && id == null) {
            res = await getTimelineTemplateOrNull(frameworkRequest, templateTimelineId);
          } else if (templateTimelineId == null && id != null) {
            res = await getTimelineOrNull(frameworkRequest, id);
          } else {
            throw new Error('please provide id or template_timeline_id');
          }

          return response.ok({ body: res ? { data: { getOneTimeline: res } } : {} });
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
