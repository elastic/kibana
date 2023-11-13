/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { map } from 'lodash';
import type { Observable } from 'rxjs';
import { lastValueFrom, zip } from 'rxjs';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import type {
  GetLiveQueryResultsRequestQuerySchema,
  GetLiveQueryResultsRequestParamsSchema,
} from '../../../common/api';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import { API_VERSIONS } from '../../../common/constants';
import { PLUGIN_ID } from '../../../common';
import type {
  ActionDetailsRequestOptions,
  ActionDetailsStrategyResponse,
  ResultsRequestOptions,
  ResultsStrategyResponse,
} from '../../../common/search_strategy';
import { Direction, OsqueryQueries } from '../../../common/search_strategy';
import { generateTablePaginationOptions } from '../../../common/utils/build_query';
import { getActionResponses } from './utils';
import {
  getLiveQueryResultsRequestParamsSchema,
  getLiveQueryResultsRequestQuerySchema,
} from '../../../common/api';

export const getLiveQueryResultsRoute = (router: IRouter<DataRequestHandlerContext>) => {
  router.versioned
    .get({
      access: 'public',
      path: '/api/osquery/live_queries/{id}/results/{actionId}',
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: buildRouteValidation<
              typeof getLiveQueryResultsRequestQuerySchema,
              GetLiveQueryResultsRequestQuerySchema
            >(getLiveQueryResultsRequestQuerySchema),
            params: buildRouteValidation<
              typeof getLiveQueryResultsRequestParamsSchema,
              GetLiveQueryResultsRequestParamsSchema
            >(getLiveQueryResultsRequestParamsSchema),
          },
        },
      },
      async (context, request, response) => {
        const abortSignal = getRequestAbortedSignal(request.events.aborted$);

        try {
          const search = await context.search;
          const { actionDetails } = await lastValueFrom(
            search.search<ActionDetailsRequestOptions, ActionDetailsStrategyResponse>(
              {
                actionId: request.params.id,
                kuery: request.query.kuery,
                factoryQueryType: OsqueryQueries.actionDetails,
              },
              { abortSignal, strategy: 'osquerySearchStrategy' }
            )
          );

          const queries = actionDetails?._source?.queries;

          await lastValueFrom(
            zip(
              ...map(queries, (query) =>
                getActionResponses(search, query.action_id, query.agents?.length ?? 0)
              )
            )
          );

          const res = await lastValueFrom(
            search.search<ResultsRequestOptions, ResultsStrategyResponse>(
              {
                actionId: request.params.actionId,
                factoryQueryType: OsqueryQueries.results,
                kuery: request.query.kuery,
                pagination: generateTablePaginationOptions(
                  request.query.page ?? 0,
                  request.query.pageSize ?? 100
                ),
                sort: [
                  {
                    direction: request.query.sortOrder ?? Direction.desc,
                    field: request.query.sort ?? '@timestamp',
                  },
                ],
              },
              { abortSignal, strategy: 'osquerySearchStrategy' }
            )
          );

          return response.ok({
            body: { data: res },
          });
        } catch (e) {
          return response.customError({
            statusCode: e.statusCode ?? 500,
            body: {
              message: e.message,
            },
          });
        }
      }
    );
};

function getRequestAbortedSignal(aborted$: Observable<void>): AbortSignal {
  const controller = new AbortController();
  aborted$.subscribe(() => controller.abort());

  return controller.signal;
}
