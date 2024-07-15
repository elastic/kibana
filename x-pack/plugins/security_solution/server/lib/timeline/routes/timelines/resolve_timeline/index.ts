/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { SecuritySolutionPluginRouter } from '../../../../../types';

import { TIMELINE_RESOLVE_URL } from '../../../../../../common/constants';

import type { ConfigType } from '../../../../..';
import { buildRouteValidationWithExcess } from '../../../../../utils/build_validation/route_validation';

import { buildSiemResponse } from '../../../../detection_engine/routes/utils';

import { buildFrameworkRequest } from '../../../utils/common';
import { getTimelineQuerySchema } from '../../../../../../common/api/timeline';
import { getTimelineTemplateOrNull, resolveTimelineOrNull } from '../../../saved_object/timelines';
import type {
  SavedTimeline,
  ResolvedTimelineWithOutcomeSavedObject,
} from '../../../../../../common/api/timeline';

export const resolveTimelineRoute = (router: SecuritySolutionPluginRouter, _: ConfigType) => {
  router.versioned
    .get({
      path: TIMELINE_RESOLVE_URL,
      options: {
        tags: ['access:securitySolution'],
      },
      access: 'public',
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: { query: buildRouteValidationWithExcess(getTimelineQuerySchema) },
        },
      },
      async (context, request, response) => {
        try {
          const frameworkRequest = await buildFrameworkRequest(context, request);
          const query = request.query ?? {};
          const { template_timeline_id: templateTimelineId, id } = query;

          let res: SavedTimeline | ResolvedTimelineWithOutcomeSavedObject | null = null;

          if (templateTimelineId != null && id == null) {
            // Template timelineId is not a SO id, so it does not need to be updated to use resolve
            res = await getTimelineTemplateOrNull(frameworkRequest, templateTimelineId);
          } else if (templateTimelineId == null && id != null) {
            // In the event the objectId is defined, run the resolve call
            res = await resolveTimelineOrNull(frameworkRequest, id);
          } else {
            throw new Error('please provide id or template_timeline_id');
          }

          return response.ok({ body: res ? { data: res } : {} });
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
