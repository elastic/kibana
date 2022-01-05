/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { transformError } from '@kbn/securitysolution-es-utils';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { TIMELINES_URL } from '../../../../../../common/constants';

import { ConfigType } from '../../../../..';
import { SetupPlugins } from '../../../../../plugin';

import { buildSiemResponse } from '../../../../detection_engine/routes/utils';

import { CustomHttpRequestError } from '../../../../../utils/custom_http_request_error';
import { buildFrameworkRequest, escapeHatch, throwErrors } from '../../../utils/common';
import { getAllTimeline } from '../../../saved_object/timelines';
import { getTimelinesQuerySchema } from '../../../schemas/timelines';

export const getTimelinesRoute = (
  router: SecuritySolutionPluginRouter,
  _config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.get(
    {
      path: TIMELINES_URL,
      validate: {
        query: escapeHatch,
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const customHttpRequestError = (message: string) => new CustomHttpRequestError(message, 400);
      try {
        const frameworkRequest = await buildFrameworkRequest(context, security, request);
        const queryParams = pipe(
          getTimelinesQuerySchema.decode(request.query),
          fold(throwErrors(customHttpRequestError), identity)
        );
        const onlyUserFavorite = queryParams?.only_user_favorite === 'true' ? true : false;
        const pageSize = queryParams?.page_size ? parseInt(queryParams.page_size, 10) : null;
        const pageIndex = queryParams?.page_index ? parseInt(queryParams.page_index, 10) : null;
        const search = queryParams?.search ?? null;
        const sortField = queryParams?.sort_field ?? null;
        const sortOrder = queryParams?.sort_order ?? null;
        const status = queryParams?.status ?? null;
        const timelineType = queryParams?.timeline_type ?? null;
        const sort =
          sortField && sortOrder
            ? {
                sortField,
                sortOrder,
              }
            : null;
        let res = null;
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

        res = await getAllTimeline(
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
