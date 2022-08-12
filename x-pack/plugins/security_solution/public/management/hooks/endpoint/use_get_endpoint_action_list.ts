/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from 'react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useQuery } from 'react-query';
import type { EndpointActionListRequestQuery } from '../../../../common/endpoint/schema/actions';
import { useHttp } from '../../../common/lib/kibana';
import { ENDPOINTS_ACTION_LIST_ROUTE } from '../../../../common/endpoint/constants';
import type { ActionListApiResponse } from '../../../../common/endpoint/types';

export const useGetEndpointActionList = (
  query: EndpointActionListRequestQuery,
  options: UseQueryOptions<ActionListApiResponse, IHttpFetchError> = {}
): UseQueryResult<ActionListApiResponse, IHttpFetchError> => {
  const http = useHttp();

  return useQuery<ActionListApiResponse, IHttpFetchError>({
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
          userIds: query.userIds,
        },
      });
    },
  });
};
