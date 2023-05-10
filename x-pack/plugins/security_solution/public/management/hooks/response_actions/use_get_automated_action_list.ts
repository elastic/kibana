/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { lastValueFrom, of } from 'rxjs';

import { mergeMap } from 'rxjs/operators';

import { compact, map } from 'lodash';
import type { PaginationInputPaginated } from '../../../../common/search_strategy/security_solution/response_actions/common';
import { Direction } from '../../../../common/search_strategy/security_solution/response_actions/types';
import type {
  ActionResponsesRequestOptions,
  ActionRequestOptions,
  ActionRequestStrategyResponse,
  ActionResponsesRequestStrategyResponse,
} from '../../../../common/search_strategy/security_solution/response_actions';
import { ResponseActionsQueries } from '../../../../common/search_strategy/security_solution/response_actions';
import { useKibana } from '../../../common/lib/kibana';
import type {
  EndpointAutomatedActionListRequestQuery,
  EndpointAutomatedActionResponseRequestQuery,
} from '../../../../common/endpoint/schema/automated_actions';

interface GetAutomatedActionsListOptions {
  skip?: boolean;
}

export const useGetAutomatedActionList = (
  query: EndpointAutomatedActionListRequestQuery,
  { skip }: GetAutomatedActionsListOptions
) => {
  const { data } = useKibana().services;

  const { alertIds } = query;
  return useQuery(
    ['get-automated-action-list', { alertIds }],
    async () => {
      const responseData = await lastValueFrom(
        data.search.search<ActionRequestOptions, ActionRequestStrategyResponse>(
          {
            alertIds,
            sort: {
              direction: Direction.desc,
              field: '@timestamp',
            },
            factoryQueryType: ResponseActionsQueries.actions,
            pagination: generateTablePaginationOptions(0, 5),
          },
          {
            strategy: 'securitySolutionSearchStrategy',
          }
        )
      );

      return {
        ...responseData,
        items: compact(map(responseData.edges, (edge) => edge._source)),
      };
    },
    {
      enabled: !skip,
      keepPreviousData: true,
    }
  );
};

export const useGetAutomatedActionResponseList = (
  query: EndpointAutomatedActionResponseRequestQuery
) => {
  const { data } = useKibana().services;
  const { expiration, actionId } = query;
  return useQuery(
    ['allResponsesResults', { actionId }],
    async () => {
      const responseData = await lastValueFrom(
        data.search
          .search<ActionResponsesRequestOptions, ActionResponsesRequestStrategyResponse>(
            {
              actionId,
              expiration,
              sort: {
                direction: Direction.desc,
                field: '@timestamp',
              },
              factoryQueryType: ResponseActionsQueries.results,
              pagination: generateTablePaginationOptions(0, 5),
            },
            {
              strategy: 'securitySolutionSearchStrategy',
            }
          )
          .pipe(
            mergeMap((val) => {
              const responded =
                val.rawResponse?.aggregations?.aggs.responses_by_action_id?.doc_count ?? 0;
              // TODO const pending = agent - responded; - I believe that we always have just one agent one
              const pending = 1 - responded;

              const expired = !expiration ? true : new Date(expiration) < new Date();
              const isCompleted = expired || pending <= 0;

              return of({
                items: val.rawResponse.hits.hits,
                action_id: actionId,
                isCompleted,
                expired,
              });
            })
          )
      );

      const action = responseData.items[0]._source;

      return {
        id: actionId,
        agents: [action?.agent.id],
        command: action?.EndpointActions.data.command,
        startedAt: action?.EndpointActions.started_at,
        isCompleted: responseData.isCompleted,
        completedAt: action?.EndpointActions.completed_at,
        isExpired: responseData.expired,
        comment: action?.EndpointActions.data.comment,
        wasSuccessful: responseData.isCompleted,
      };
    },
    {
      keepPreviousData: true,
    }
  );
};
export const generateTablePaginationOptions = (
  activePage: number,
  limit: number
): PaginationInputPaginated => {
  const cursorStart = activePage * limit;

  return {
    activePage,
    cursorStart,
    querySize: limit,
  };
};
