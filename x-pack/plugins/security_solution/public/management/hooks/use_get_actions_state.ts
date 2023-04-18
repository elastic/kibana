/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { ACTION_STATE_ROUTE } from '../../../common/endpoint/constants';
import { useHttp } from '../../common/lib/kibana';

interface GetActionsStateResponse {
  canEncrypt?: boolean;
}
/**
 * Get info for actions state
 */
export const useGetActionsState = (): UseQueryResult<GetActionsStateResponse, IHttpFetchError> => {
  const http = useHttp();

  return useQuery<GetActionsStateResponse, IHttpFetchError>({
    queryKey: ['get-actions-state'],
    queryFn: () => {
      return http.get<GetActionsStateResponse>(ACTION_STATE_ROUTE);
    },
  });
};
