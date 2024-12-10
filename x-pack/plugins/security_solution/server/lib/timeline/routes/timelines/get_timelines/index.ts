/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core-http-server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';

import { transformError } from '@kbn/securitysolution-es-utils';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { TIMELINES_URL } from '../../../../../../common/constants';

import { buildSiemResponse } from '../../../../detection_engine/routes/utils';

import { buildFrameworkRequest } from '../../../utils/common';
import { getAllTimeline } from '../../../saved_object/timelines';
import {
  GetTimelinesRequestQuery,
  type GetTimelinesResponse,
} from '../../../../../../common/api/timeline';

export const getTimelinesRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .get({
      path: TIMELINES_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      access: 'public',
    })
    .addVersion(
      {
        validate: {
          request: { query: buildRouteValidationWithZod(GetTimelinesRequestQuery) },
        },
        version: '2023-10-31',
      },
      async (context, request, response): Promise<IKibanaResponse<GetTimelinesResponse>> => {
        try {
          const frameworkRequest = await buildFrameworkRequest(context, request);
          const onlyUserFavorite = request.query?.only_user_favorite === 'true';
          const pageSize = request.query?.page_size ? parseInt(request.query.page_size, 10) : null;
          const pageIndex = request.query?.page_index
            ? parseInt(request.query.page_index, 10)
            : null;
          const search = request.query?.search ?? null;
          const sortField = request.query?.sort_field ?? null;
          const sortOrder = request.query?.sort_order ?? null;
          const status = request.query?.status ?? null;
          const timelineType = request.query?.timeline_type ?? null;
          const sort =
            sortField && sortOrder
              ? {
                  sortField,
                  sortOrder,
                }
              : null;
          let totalCount = null;

          if (pageSize == null && pageIndex == null) {
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

          const res = await getAllTimeline(
            frameworkRequest,
            onlyUserFavorite,
            {
              pageSize: pageSize ?? totalCount ?? 1,
              pageIndex: pageIndex ?? 1,
            },
            search,
            sort,
            status,
            timelineType
          );

          return response.ok({ body: res });
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
