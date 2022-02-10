/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryObserverResult, useQuery } from 'react-query';
import { useHttp } from '../../../common/lib/kibana/hooks';
import { ServerApiError } from '../../../common/types';
import { GetPolicyListResponse } from '../../pages/policy/types';
import { sendGetEndpointSpecificPackagePolicies } from './policies';

export function useGetEndpointSpecificPolicies({
  onError,
}: {
  onError?: (error: ServerApiError) => void;
} = {}): QueryObserverResult<GetPolicyListResponse> {
  const http = useHttp();
  return useQuery<GetPolicyListResponse, ServerApiError>(
    ['endpointSpecificPolicies'],
    () => {
      return sendGetEndpointSpecificPackagePolicies(http, {
        query: {
          page: 1,
          perPage: 1000,
        },
      });
    },
    {
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      onError,
    }
  );
}
