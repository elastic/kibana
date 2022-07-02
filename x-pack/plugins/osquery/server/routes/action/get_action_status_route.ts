/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { every, mapKeys } from 'lodash';
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

const getActionResponses = (search, actionId, queriedAgentIds, partialResults = false) =>
  lastValueFrom(
    search
      .search<ActionResultsRequestOptions, ActionResultsStrategyResponse>(
        {
          actionId,
          factoryQueryType: OsqueryQueries.actionResults,
          filterQuery: '',
          pagination: generateTablePaginationOptions(0, 1000),
          sort: {
            direction: 'desc',
            field: '@timestamp',
          },
        },
        {
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
          const pending = queriedAgentIds.length - totalResponded;

          if (!partialResults && pending) {
            return throwError(() => new Error('Error!'));
          }

          return of({
            actionId,
            totalResponded,
            totalRowCount,
            successful,
            failed,
            pending,
          });
        }),
        ...(!partialResults ? [retry({ count: 2, delay: 1000 })] : [])
      )
      .pipe(
        catchError(() =>
          of({
            actionId,
          })
        )
      )
  );

export const getActionStatusRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.get(
    {
      path: '/api/osquery/live_queries/{id}/status',
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

        const actionIds = actionDetailsResponse?.actionDetails?.fields['queries.action_id'];
        const queriedAgentIds = actionDetailsResponse?.actionDetails?.fields.agents;
        const expirationDate = actionDetailsResponse?.actionDetails?.fields.expiration;

        const expired = !expirationDate ? true : new Date(expirationDate) < new Date();

        let responseData;
        try {
          responseData = await lastValueFrom(
            of(actionIds).pipe(
              mergeMap((actions) =>
                forkJoin(
                  actions.map((actionId) =>
                    getActionResponses(search, actionId, queriedAgentIds, true)
                  )
                )
              )
            )
          );
        } catch (e) {
          return response.ok({ body: { error: e.message } });
        }

        const isCompleted = expired || (responseData && every(responseData, ['pending', 0]));

        return response.ok({
          body: {
            status: isCompleted ? 'completed' : 'running',
            responses: mapKeys(responseData, 'actionId'),
          },
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
