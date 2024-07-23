/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithExcess } from '../../../../../utils/build_validation/route_validation';
import type { ConfigType } from '../../../../..';
import { copyTimelineSchema } from '../../../../../../common/api/timeline';
import { copyTimeline } from '../../../saved_object/timelines';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { TIMELINE_COPY_URL } from '../../../../../../common/constants';
import { buildSiemResponse } from '../../../../detection_engine/routes/utils';

import { buildFrameworkRequest } from '../../../utils/common';

export const copyTimelineRoute = (router: SecuritySolutionPluginRouter, _: ConfigType) => {
  router.versioned
    .post({
      path: TIMELINE_COPY_URL,
      options: {
        tags: ['access:securitySolution'],
      },
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { body: buildRouteValidationWithExcess(copyTimelineSchema) },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const frameworkRequest = await buildFrameworkRequest(context, request);
          const { timeline, timelineIdToCopy } = request.body;
          const copiedTimeline = await copyTimeline(frameworkRequest, timeline, timelineIdToCopy);

          return response.ok({
            body: { data: { persistTimeline: copiedTimeline } },
          });
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
