/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { lastValueFrom, Observable, timer, zip, of, throwError, forkJoin } from 'rxjs';
import {
  map,
  tap,
  mergeMap,
  retry,
  catchError,
  retryWhen,
  delayWhen,
  withLatestFrom,
} from 'rxjs/operators';
import { PLUGIN_ID } from '../../../common';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { OsqueryQueries } from '../../../common/search_strategy';
import { createFilter, generateTablePaginationOptions } from '../../../common/utils/build_query';

const getActionResponses = (search, actionId, queriedAgentIds, request, abortSignal) =>
  lastValueFrom(
    search
      .search<ActionResultsRequestOptions, ActionResultsStrategyResponse>(
        {
          actionId,
          factoryQueryType: OsqueryQueries.actionResults,
          filterQuery: createFilter(request.params.filterQuery),
          pagination: generateTablePaginationOptions(
            request.params.activePage ?? 0,
            request.params.limit ?? 100
          ),
          sort: {
            direction: request.params.direction ?? 'desc',
            field: request.params.sortField ?? '@timestamp',
          },
        },
        {
          abortSignal,
          strategy: 'osquerySearchStrategy',
        }
      )
      .pipe(
        mergeMap((val) => {
          const totalResponded =
            // @ts-expect-error update types
            val.rawResponse?.aggregations?.aggs.responses_by_action_id?.doc_count ?? 0;
          const totalRowCount =
            // @ts-expect-error update types
            val.rawResponse?.aggregations?.aggs.responses_by_action_id?.rows_count?.value ?? 0;
          const aggsBuckets =
            // @ts-expect-error update types
            val.rawResponse?.aggregations?.aggs.responses_by_action_id?.responses.buckets;
          const successful =
            aggsBuckets?.find((bucket) => bucket.key === 'success')?.doc_count ?? 0;
          // @ts-expect-error update types
          const failed = aggsBuckets?.find((bucket) => bucket.key === 'error')?.doc_count ?? 0;
          const pending = queriedAgentIds.length - totalResponded || true;

          console.log(
            'queriedAgentIds',
            queriedAgentIds,
            queriedAgentIds.length - totalResponded,
            pending
          );

          if (pending) {
            return throwError(() => new Error('Error!'));
          }

          return of(val);
        }),
        retry({ count: 2, delay: 1000 })
      )
      .pipe(catchError(() => of('dupa')))
  );

export const getActionResultsRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.get(
    {
      path: '/api/osquery/live_queries/{id}/results',
      validate: {
        params: schema.object({}, { unknowns: 'allow' }),
      },
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    async (context, request, response) => {
      const abortSignal = getRequestAbortedSignal(request.events.aborted$);

      try {
        const search = await context.search;
        const actionDetailsResponse = await lastValueFrom(
          search.search(
            {
              actionId: request.params.id,
              factoryQueryType: OsqueryQueries.actionDetails,
            },
            { abortSignal, strategy: 'osquerySearchStrategy' }
          )
        );

        // console.log(JSON.stringify(actionDetailsResponse, null, 2));

        const actionIds = actionDetailsResponse?.actionDetails?.fields['queries.action_id'];
        const queriedAgentIds = actionDetailsResponse?.actionDetails?.fields.agents;

        // check if expired then omit the check
        let responseData;
        try {
          responseData = await lastValueFrom(
            of(actionIds).pipe(
              mergeMap((actions) =>
                forkJoin(
                  actions.map((actionId) =>
                    getActionResponses(search, actionId, queriedAgentIds, request, abortSignal)
                  )
                )
              )
            )
          );
        } catch (e) {
          return response.ok({ body: { error: e.message } });
        }

        console.log('aaaaaaaaaaaaaa');

        console.log('responseData', JSON.stringify(responseData, null, 2));

        console.log('ssssssssssssss');

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
        // console.log(JSON.stringify(e.errBody, null, 2));

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
