/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpFetchError } from '@kbn/core/public';
import type { UseQueryResult, UseQueryOptions } from 'react-query';
import { useQuery } from 'react-query';
import { useHttp } from '../../../common/lib/kibana';
import { BASE_POLICY_RESPONSE_ROUTE } from '../../../../common/endpoint/constants';
import type { GetHostPolicyResponse } from '../../../../common/endpoint/types';

export function useGetEndpointPolicyResponse(
  selectedEndpoint: string,
  customQueryOptions?: UseQueryOptions<GetHostPolicyResponse, HttpFetchError>
): UseQueryResult<GetHostPolicyResponse, HttpFetchError> {
  const http = useHttp();
  return useQuery<GetHostPolicyResponse, HttpFetchError>(
    ['getEndpointPolicyResponse', selectedEndpoint],
    () => {
      return http.get<GetHostPolicyResponse>(BASE_POLICY_RESPONSE_ROUTE, {
        query: { agentId: selectedEndpoint },
      });
    },
    customQueryOptions
  );
}
