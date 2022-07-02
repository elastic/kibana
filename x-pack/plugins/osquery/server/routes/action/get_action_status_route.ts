/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { every, map, mapKeys } from 'lodash';
import { lastValueFrom, Observable, zip } from 'rxjs';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { PLUGIN_ID } from '../../../common';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getActionResponses } from './utils';
import {
  ActionDetailsRequestOptions,
  ActionDetailsStrategyResponse,
  OsqueryQueries,
} from '../../../common/search_strategy';

export const getActionStatusRoute = (
  router: IRouter<DataRequestHandlerContext>,
  osqueryContext: OsqueryAppContext
) => {
  router.get(
    {
      path: '/api/osquery/live_queries/{id}/status',
      validate: {
        query: schema.object({}, { unknowns: 'allow' }),
        params: schema.object({ id: schema.string() }, { unknowns: 'allow' }),
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

        const responseData = await lastValueFrom(
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

        const isCompleted = expired || (responseData && every(responseData, ['pending', 0]));

        return response.custom({
          statusCode: isCompleted ? 200 : 408,
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
