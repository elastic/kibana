/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySolutionPluginRouter } from '../../../../../types';

import { TIMELINES_URL } from '../../../../../../common/constants';

import { ConfigType } from '../../../../..';
import { SetupPlugins } from '../../../../../plugin';
import { buildRouteValidationWithExcess } from '../../../../../utils/build_validation/route_validation';

import { buildSiemResponse, transformError } from '../../../../detection_engine/routes/utils';

import { buildFrameworkRequest } from '../../../utils/common';
import { getTimelineQuerySchema } from '../../../schemas/timelines';
import {
  getTimelineTemplateOrNull,
  getTimelineOrNull,
  getAllTimeline,
} from '../../../saved_object/timelines';
import { getTimelinesBodySchema, TimelineStatus } from '../../../../../../common/types/timeline';

export const getTimelinesRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.get(
    {
      path: TIMELINES_URL,
      validate: {
        // query: buildRouteValidationWithExcess(getTimelinesBodySchema),
        // body: buildRouteValidationWithExcess(getTimelinesBodySchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      try {
        console.log('request query', request.query);
        const frameworkRequest = await buildFrameworkRequest(context, security, request);
        const onlyUserFavorite = request.query?.onlyUserFavorite ?? false;
        const pageInfo = request.query?.pageInfo ? JSON.parse(request?.query?.pageInfo) : null;
        const search = request.query?.search ?? null;
        const sort = request.query?.sort ? JSON.parse(request?.query?.sort) : null;
        const status = request.query?.status ?? null;
        const timelineType = request.query?.timelineType ?? null;
        let res = null;
        let totalCount = null;

        if (pageInfo == null) {
          const allActiveTimelines = await getAllTimeline(
            frameworkRequest,
            false,
            { pageSize: 1, pageIndex: 1 },
            null,
            null,
            null,
            null
          );
          totalCount = allActiveTimelines.totalCount;
        }

        res = await getAllTimeline(
          frameworkRequest,
          onlyUserFavorite,
          pageInfo ?? { pageSize: totalCount ?? 0, pageIndex: 1 },
          search,
          sort,
          status,
          timelineType
        );

        return response.ok({ body: res ?? {} });
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
