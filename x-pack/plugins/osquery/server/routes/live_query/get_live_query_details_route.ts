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
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { PLUGIN_ID } from '../../../common';
import { getActionResponses } from './utils';

import type {
  ActionDetailsRequestOptions,
  ActionDetailsStrategyResponse,
} from '../../../common/search_strategy';
import { OsqueryQueries } from '../../../common/search_strategy';

export const getLiveQueryDetailsRoute = (router: IRouter<DataRequestHandlerContext>) => {
  router.get(
    {
      path: '/api/osquery/live_queries/{id}',
      validate: {
        params: schema.object(
          {
            id: schema.string(),
          },
          { unknowns: 'allow' }
        ),
        query: schema.object({}, { unknowns: 'allow' }),
      },
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    async (context, request, response) => {
      const abortSignal = getRequestAbortedSignal(request.events.aborted$);

      try {
        const search = await context.search;
        const { actionDetails } = await lastValueFrom(
          search.search<ActionDetailsRequestOptions, ActionDetailsStrategyResponse>(
            {
              actionId: request.params.id,
              filterQuery: request.query,
              factoryQueryType: OsqueryQueries.actionDetails,
            },
            { abortSignal, strategy: 'osquerySearchStrategy' }
          )
        );

        const queries = actionDetails?._source?.queries;
        const expirationDate = actionDetails?.fields?.expiration[0];

        const expired = !expirationDate ? true : new Date(expirationDate) < new Date();

        const responseData = await lastValueFrom(
          zip(
            ...map(queries, (query) =>
              getActionResponses(search, query.action_id, query.agents?.length ?? 0)
            )
          )
        );

        const isCompleted = expired || (responseData && every(responseData, ['pending', 0]));
        const agentByActionIdStatusMap = mapKeys(responseData, 'action_id');

        return response.ok({
          body: {
            data: {
              ...pick(
                actionDetails._source,
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
              queries: reduce<
                {
                  action_id: string;
                  id: string;
                  query: string;
                  agents: string[];
                  ecs_mapping?: unknown;
                  version?: string;
                  platform?: string;
                  saved_query_id?: string;
                },
                Array<Record<string, unknown>>
              >(
                actionDetails._source?.queries,
                (acc, query) => {
                  const agentStatus = agentByActionIdStatusMap[query.action_id];

                  acc.push({
                    ...query,
                    ...agentStatus,
                    status: isCompleted || agentStatus?.pending === 0 ? 'completed' : 'running',
                  });

                  return acc;
                },
                [] as Array<Record<string, unknown>>
              ),
              status: isCompleted ? 'completed' : 'running',
            },
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
