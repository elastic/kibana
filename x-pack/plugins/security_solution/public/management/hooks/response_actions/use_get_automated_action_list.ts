/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useQuery } from '@tanstack/react-query';
import { lastValueFrom, of } from 'rxjs';

import { mergeMap } from 'rxjs/operators';
import { ResponseActionsQueries } from '../../../../common/search_strategy/security_solution/response_actions';
import type { ActionListApiResponse } from '../../../../common/endpoint/types';
import { useKibana } from '../../../common/lib/kibana';
import type { EndpointActionListRequestQuery } from '../../../../common/endpoint/schema/actions';

interface ErrorType {
  statusCode: number;
  message: string;
}

export const useGetAutomatedActionList = (
  query: EndpointActionListRequestQuery,
  options: UseQueryOptions<ActionListApiResponse, IHttpFetchError<ErrorType>> = {}
): UseQueryResult<ActionListApiResponse, IHttpFetchError<ErrorType>> => {
  const { data } = useKibana().services;

  const { alertIds } = query;
  return useQuery(
    ['get-automated-action-list', { alertIds }],
    async () => {
      const responseData = await lastValueFrom(
        data.search.search<any, any>(
          // data.search.search<ResultsRequestOptions, ResultsStrategyResponse>(
          {
            alertIds,
            sort: {
              direction: 'desc',
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
        items: responseData.edges.map((edge) => {
          return edge._source;
        }),
      };
    },
    {
      keepPreviousData: true,

      // refetchInterval: isLive ? 5000 : false;
    }
  );
};

export const useGetAutomatedActionResponseList = (
  query: EndpointActionListRequestQuery,
  options: UseQueryOptions<ActionListApiResponse, IHttpFetchError<ErrorType>> = {}
): UseQueryResult<ActionListApiResponse, IHttpFetchError<ErrorType>> => {
  const { data } = useKibana().services;
  const { expiration, actionId } = query;
  console.log({ query });
  return useQuery(
    ['allResponsesResults', { actionId }],
    async () => {
      const responseData = await lastValueFrom(
        data.search
          .search<any, any>(
            // data.search.search<ResultsRequestOptions, ResultsStrategyResponse>(
            {
              actionId,
              expiration,
              sort: {
                direction: 'desc',
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
              console.log({ val });
              const responded =
                val.rawResponse?.aggregations?.aggs.responses_by_action_id?.doc_count ?? 0;
              // const pending = agent - responded;
              const pending = 1 - responded;

              console.log({ responded, pending });
              const expired = !expiration ? true : new Date(expiration) < new Date();
              const isCompleted = expired || pending <= 0;

              return of({
                edges: val.edges,
                action_id: actionId,
                isCompleted,
                expired,
              });
            })
          )
      );
      console.log({ responseData });

      const action = responseData.edges[0]._source;

      console.log({ action });
      const actionRecord: ActionListApiResponse['data'][number] = {
        id: actionId,
        agents: [action.agent.id],
        command: action.EndpointActions.data.command,
        startedAt: action.EndpointActions.started_at,
        isCompleted: responseData.isCompleted,
        completedAt: action.EndpointActions.completed_at,
        isExpired: responseData.expired,
        comment: action.EndpointActions.data.comment,
        wasSuccessful: true,
        // parameters: action.parameters,
        // alertIds: action.alertIds,
        // ruleId: action.ruleId,
        // ruleName: action.ruleName,
      };

      return actionRecord;
    },
    {
      keepPreviousData: true,
      // refetchInterval: isLive ? 5000 : false;
    }
  );
};
export const generateTablePaginationOptions = (activePage: number, limit: number): any => {
  // ): PaginationInputPaginated => {
  const cursorStart = activePage * limit;

  return {
    activePage,
    cursorStart,
    querySize: limit,
  };
};
