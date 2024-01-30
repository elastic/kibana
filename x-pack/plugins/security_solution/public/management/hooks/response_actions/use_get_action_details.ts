/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useQuery } from '@tanstack/react-query';
import { useHttp } from '../../../common/lib/kibana';
import { resolvePathVariables } from '../../../common/utils/resolve_path_variables';
import { ACTION_DETAILS_ROUTE } from '../../../../common/endpoint/constants';
import type {
  ActionDetailsApiResponse,
  EndpointActionDataParameterTypes,
  EndpointActionResponseDataOutput,
} from '../../../../common/endpoint/types';

export const useGetActionDetails = <
  TOutputContent extends EndpointActionResponseDataOutput = EndpointActionResponseDataOutput,
  TParameters extends EndpointActionDataParameterTypes = EndpointActionDataParameterTypes
>(
  actionId: string,
  options: UseQueryOptions<
    ActionDetailsApiResponse<TOutputContent, TParameters>,
    IHttpFetchError
  > = {}
): UseQueryResult<ActionDetailsApiResponse<TOutputContent, TParameters>, IHttpFetchError> => {
  const http = useHttp();

  return useQuery<ActionDetailsApiResponse<TOutputContent, TParameters>, IHttpFetchError>({
    queryKey: ['get-action-details', actionId],
    ...options,
    queryFn: () => {
      return http.get<ActionDetailsApiResponse<TOutputContent, TParameters>>(
        resolvePathVariables(ACTION_DETAILS_ROUTE, { action_id: actionId.trim() || 'undefined' }),
        {
          version: '2023-10-31',
        }
      );
    },
  });
};
