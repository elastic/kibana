/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useQuery } from '@tanstack/react-query';
import type { EndpointActionListRequestQuery } from '../../../../common/endpoint/schema/actions';
import { useHttp } from '../../../common/lib/kibana';
import { ENDPOINTS_ACTION_LIST_ROUTE } from '../../../../common/endpoint/constants';
import type { ActionListApiResponse } from '../../../../common/endpoint/types';

interface ErrorType {
  statusCode: number;
  message: string;
}

export const useGetEndpointActionList = (
  query: EndpointActionListRequestQuery,
  options: UseQueryOptions<ActionListApiResponse, IHttpFetchError<ErrorType>> = {}
): UseQueryResult<ActionListApiResponse, IHttpFetchError<ErrorType>> => {
  const http = useHttp();

  // prepend and append * to userIds for fuzzy search
  let userIds = query.userIds;
  if (typeof query.userIds === 'string') {
    userIds = `*${query.userIds}*`;
  } else if (Array.isArray(query.userIds)) {
    userIds = query.userIds.map((userId) => `*${userId}*`);
  }

  return useQuery<ActionListApiResponse, IHttpFetchError<ErrorType>>({
    queryKey: ['get-action-list', query],
    ...options,
    queryFn: async () => {
      return http.get<ActionListApiResponse>(ENDPOINTS_ACTION_LIST_ROUTE, {
        query: {
          agentIds: query.agentIds,
          commands: query.commands,
          endDate: query.endDate,
          page: query.page,
          pageSize: query.pageSize,
          startDate: query.startDate,
          statuses: query.statuses,
          userIds,
        },
      });
    },
  });
};
