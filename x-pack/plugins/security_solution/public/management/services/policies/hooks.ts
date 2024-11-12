/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { QueryObserverResult, UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { BulkGetAgentPoliciesResponse } from '@kbn/fleet-plugin/common';
import { type GetInfoResponse } from '@kbn/fleet-plugin/common';
import { firstValueFrom } from 'rxjs';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { ENDPOINT_PACKAGE_POLICIES_STATS_STRATEGY } from '../../../../common/endpoint/constants';
import { useHttp, useKibana } from '../../../common/lib/kibana';
import { MANAGEMENT_DEFAULT_PAGE_SIZE } from '../../common/constants';
import { sendBulkGetAgentPolicies, sendGetEndpointSecurityPackage } from './ingest';
import type { GetPolicyListResponse } from '../../pages/policy/types';
import { sendGetEndpointSpecificPackagePolicies } from './policies';
import type { ServerApiError } from '../../../common/types';

// FIXME:PT move to `hooks` folder
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
          withAgentCount: true,
        },
      });
    },
    onError
      ? {
          onError,
        }
      : undefined
  );
}

export function useEndpointPackagePoliciesStats(enabled: boolean) {
  const { data } = useKibana().services;
  return useQuery(
    ['endpointPackagePoliciesStatsStrategy'],
    async () => {
      return firstValueFrom(
        data.search.search<{}, IKibanaSearchResponse<{ outdatedManifestsCount: number }>>(
          {},
          { strategy: ENDPOINT_PACKAGE_POLICIES_STATS_STRATEGY }
        )
      );
    },
    { select: (response) => response.rawResponse, enabled }
  );
}

/**
 * This hook returns the endpoint security package which contains endpoint version info
 */
export function useGetEndpointSecurityPackage({
  customQueryOptions,
}: {
  customQueryOptions?: UseQueryOptions<GetInfoResponse['item'], IHttpFetchError>;
}): QueryObserverResult<GetInfoResponse['item'], IHttpFetchError> {
  const http = useHttp();
  return useQuery<GetInfoResponse['item'], IHttpFetchError>(
    ['endpointPackageVersion', customQueryOptions],
    () => {
      return sendGetEndpointSecurityPackage(http);
    },
    customQueryOptions
  );
}

export function useBulkGetAgentPolicies({
  isEnabled,
  policyIds,
}: {
  isEnabled: boolean;
  policyIds: string[];
}): QueryObserverResult<BulkGetAgentPoliciesResponse['items'], IHttpFetchError> {
  const http = useHttp();

  return useQuery<BulkGetAgentPoliciesResponse['items'], IHttpFetchError>(
    ['agentPolicies', policyIds],

    async () => {
      if (!policyIds.length) {
        return [];
      }

      return (await sendBulkGetAgentPolicies({ http, requestBody: { ids: policyIds } }))?.items;
    },

    { enabled: isEnabled, refetchOnWindowFocus: false, retry: 1 }
  );
}
