/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { StartServicesAccessor } from '@kbn/core/server';
import { buildRouteValidationWithExcess } from '../../../../../utils/build_validation/route_validation';
import type { ConfigType } from '../../../../..';
import { cloneTimelineSchema } from '../../../../../../common/api/timeline';
import { cloneTimeline } from '../../../saved_object/timelines';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import type { StartPlugins, SetupPlugins } from '../../../../../plugin';
import { TIMELINE_CLONE_URL } from '../../../../../../common/constants';
import { buildSiemResponse } from '../../../../detection_engine/routes/utils';

import { buildFrameworkRequest } from '../../../utils/common';

export const cloneTimelineRoute = async (
  router: SecuritySolutionPluginRouter,
  startServices: StartServicesAccessor<StartPlugins>,
  _: ConfigType,
  security: SetupPlugins['security']
) => {
  const [, { data }] = await startServices();

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
          const searchSourceClient = await data.search.searchSource.asScoped(request);
          const frameworkRequest = await buildFrameworkRequest(context, security, request);
          const { timeline, timelineIdToClone } = request.body;
          const clonedTimeline = await cloneTimeline(
            frameworkRequest,
            timeline,
            timelineIdToClone,
            searchSourceClient
          );

          return response.ok({
            body: { data: { persistTimeline: clonedTimeline } },
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
