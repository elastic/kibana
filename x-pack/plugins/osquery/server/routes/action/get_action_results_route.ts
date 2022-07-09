/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { map } from 'lodash';
import type { Observable } from 'rxjs';
import { lastValueFrom, zip } from 'rxjs';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { PLUGIN_ID } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import type {
  ActionDetailsRequestOptions,
  ActionDetailsStrategyResponse,
} from '../../../common/search_strategy';
import { OsqueryQueries } from '../../../common/search_strategy';
import { createFilter, generateTablePaginationOptions } from '../../../common/utils/build_query';
import { getActionResponses } from './utils';

export const getActionResultsRoute = (
  router: IRouter<DataRequestHandlerContext>,
  osqueryContext: OsqueryAppContext
) => {
  router.get(
    {
      path: '/api/osquery/live_queries/{id}/results',
      validate: {
        query: schema.object({}, { unknowns: 'allow' }),
        params: schema.object({}, { unknowns: 'allow' }),
      },
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    async (context, request, response) => {
      const abortSignal = getRequestAbortedSignal(request.events.aborted$);

      try {
        const search = await context.search;
        const actionDetailsResponse = await lastValueFrom(
          search.search<ActionDetailsRequestOptions, ActionDetailsStrategyResponse>(
            {
              actionId: request.params.id,
              factoryQueryType: OsqueryQueries.actionDetails,
            },
            { abortSignal, strategy: 'osquerySearchStrategy' }
          )
        );

        const actionIds = actionDetailsResponse?.actionDetails?.fields['queries.action_id'];
        const queriedAgentIds = actionDetailsResponse?.actionDetails?.fields.agents;
        const expirationDate = actionDetailsResponse?.actionDetails?.fields.expiration[0];

        const expired = !expirationDate ? true : new Date(expirationDate) < new Date();

        await lastValueFrom(
          zip(
            ...map(actionIds, (actionId) =>
              getActionResponses(
                search,
                actionId,
                queriedAgentIds,
                expired ? true : request.query.partial_data || true
              )
            )
          )
        );

        const res = await lastValueFrom(
          search.search(
            {
              actionId: actionIds[0],
              factoryQueryType: OsqueryQueries.results,
              filterQuery: createFilter(request.params.filterQuery),
              pagination: generateTablePaginationOptions(
                request.params.activePage ?? 0,
                request.params.limit ?? 100
              ),
              sort: [
                {
                  direction: request.params.direction ?? 'desc',
                  field: request.params.sortField ?? '@timestamp',
                },
              ],
            },
            { abortSignal, strategy: 'osquerySearchStrategy' }
          )
        );

        return response.ok({
          body: res,
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
