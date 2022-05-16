/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpFetchError, HttpSetup } from '@kbn/core/public';
import { QueryObserverResult, useQuery, UseQueryOptions } from 'react-query';
import { BASE_POLICY_RESPONSE_ROUTE } from '../../../../common/endpoint/constants';
import { GetHostPolicyResponse } from '../../../../common/endpoint/types';

export function useGetEndpointPolicyResponse(
  http: HttpSetup,
  selectedEndpoint: string,
  customQueryOptions?: UseQueryOptions<GetHostPolicyResponse, HttpFetchError>
): QueryObserverResult<GetHostPolicyResponse, HttpFetchError> {
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
