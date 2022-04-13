/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryObserverResult, useQuery, UseQueryOptions } from 'react-query';
import { HttpFetchError } from 'kibana/public';
import {
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  GetAgentPoliciesResponse,
  GetPackagesResponse,
} from '../../../../../fleet/common';
import { useHttp } from '../../../common/lib/kibana';
import { MANAGEMENT_DEFAULT_PAGE_SIZE } from '../../common/constants';
import { sendGetAgentPolicyList, sendGetEndpointSecurityPackage } from './ingest';
import { GetPolicyListResponse } from '../../pages/policy/types';
import { sendGetEndpointSpecificPackagePolicies } from './policies';
import { ServerApiError } from '../../../common/types';

export function useGetEndpointSpecificPolicies(
  {
    onError,
    page,
    perPage,
  }: {
    onError?: (error: ServerApiError) => void;
    page?: number;
    perPage?: number;
  } = { page: 1, perPage: MANAGEMENT_DEFAULT_PAGE_SIZE }
): QueryObserverResult<GetPolicyListResponse> {
  const http = useHttp();
  return useQuery<GetPolicyListResponse, ServerApiError>(
    ['endpointSpecificPolicies', page, perPage],
    () => {
      return sendGetEndpointSpecificPackagePolicies(http, {
        query: {
          page,
          perPage,
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

/**
 * @param policyIds: list of policyIds to grab the agent policies list for
 * @param customQueryOptions: useQuery options such as enabled, which will set whether the query automatically runs or not
 *
 * This hook returns the fleet agent policies list filtered by policy id
 */
export function useGetAgentCountForPolicy({
  policyIds,
  customQueryOptions = {},
}: {
  policyIds: string[];
  customQueryOptions?: UseQueryOptions<GetAgentPoliciesResponse, HttpFetchError>;
}): QueryObserverResult<GetAgentPoliciesResponse, HttpFetchError> {
  const http = useHttp();
  return useQuery<GetAgentPoliciesResponse, HttpFetchError>(
    ['endpointCountForPolicy', policyIds],
    () => {
      return sendGetAgentPolicyList(http, {
        query: {
          perPage: 50,
          kuery: `${AGENT_POLICY_SAVED_OBJECT_TYPE}.package_policies: (${policyIds.join(' or ')})`,
        },
      });
    },
    {
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      ...customQueryOptions,
    }
  );
}

/**
 * This hook returns the endpoint security package which contains endpoint version info
 */
export function useGetEndpointSecurityPackage({
  customQueryOptions = {},
}: {
  customQueryOptions?: UseQueryOptions<GetPackagesResponse['items'][number], HttpFetchError>;
}): QueryObserverResult<GetPackagesResponse['items'][number], HttpFetchError> {
  const http = useHttp();
  return useQuery<GetPackagesResponse['items'][number], HttpFetchError>(
    ['endpointPackageVersion', customQueryOptions],
    () => {
      return sendGetEndpointSecurityPackage(http);
    },
    {
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      ...customQueryOptions,
    }
  );
}
