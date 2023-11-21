/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { SecuritySolutionPluginRouter } from '../../../../../types';

import { TIMELINE_FAVORITE_URL } from '../../../../../../common/constants';

import type { SetupPlugins } from '../../../../../plugin';
import { buildRouteValidationWithExcess } from '../../../../../utils/build_validation/route_validation';
import type { ConfigType } from '../../../../..';

import { buildSiemResponse } from '../../../../detection_engine/routes/utils';

import { buildFrameworkRequest } from '../../../utils/common';
import { persistFavorite } from '../../../saved_object/timelines';
import { TimelineType, persistFavoriteSchema } from '../../../../../../common/api/timeline';

export const persistFavoriteRoute = (
  router: SecuritySolutionPluginRouter,
  _: ConfigType,
  security: SetupPlugins['security']
) => {
  router.versioned
    .patch({
      path: TIMELINE_FAVORITE_URL,
      options: {
        tags: ['access:securitySolution'],
      },
      access: 'public',
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: { body: buildRouteValidationWithExcess(persistFavoriteSchema) },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const frameworkRequest = await buildFrameworkRequest(context, security, request);
          const { timelineId, templateTimelineId, templateTimelineVersion, timelineType } =
            request.body;

          const timeline = await persistFavorite(
            frameworkRequest,
            timelineId || null,
            templateTimelineId || null,
            templateTimelineVersion || null,
            timelineType || TimelineType.default
          );

          return response.ok({
            body: {
              data: {
                persistFavorite: timeline,
              },
            },
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
