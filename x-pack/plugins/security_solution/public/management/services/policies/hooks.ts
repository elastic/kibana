/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { QueryObserverResult, UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { GetInfoResponse } from '@kbn/fleet-plugin/common';
import { useHttp } from '../../../common/lib/kibana';
import { MANAGEMENT_DEFAULT_PAGE_SIZE } from '../../common/constants';
import { sendGetEndpointSecurityPackage } from './ingest';
import type { GetPolicyListResponse } from '../../pages/policy/types';
import { sendGetEndpointSpecificPackagePolicies } from './policies';
import type { ServerApiError } from '../../../common/types';

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
