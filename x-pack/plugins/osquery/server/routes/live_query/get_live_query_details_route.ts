/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { every, map, mapKeys, pick, reduce } from 'lodash';
import type { Observable } from 'rxjs';
import { lastValueFrom, zip } from 'rxjs';
import { PLUGIN_ID } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getActionResponses } from './utils';

import { OsqueryQueries } from '../../../common/search_strategy';

export const getLiveQueryDetailsRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.get(
    {
      path: '/api/osquery/live_queries/{id}',
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

        const queries = actionDetailsResponse?.actionDetails?._source.queries;
        const expirationDate = actionDetailsResponse?.actionDetails?.fields.expiration[0];

        const expired = !expirationDate ? true : new Date(expirationDate) < new Date();

        const responseData = await lastValueFrom(
          zip(...map(queries, (query) => getActionResponses(search, query.action_id, query.agents)))
        );

        const isCompleted = expired || (responseData && every(responseData, ['pending', 0]));
        const agentByActionIdStatusMap = mapKeys(responseData, 'action_id');

        return response.ok({
          body: {
            ...pick(
              actionDetailsResponse?.actionDetails._source,
              'action_id',
              'expiration',
              '@timestamp',
              'agent_selection',
              'agents',
              'user_id',
              'pack_id',
              'pack_name',
              'prebuilt_pack'
            ),
            queries: reduce(
              actionDetailsResponse?.actionDetails._source.queries,
              (acc, query) => {
                acc.push({
                  ...query,
                  ...agentByActionIdStatusMap[query.action_id],
                });

                return acc;
              },
              []
            ),
            status: isCompleted ? 'completed' : 'running',
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
