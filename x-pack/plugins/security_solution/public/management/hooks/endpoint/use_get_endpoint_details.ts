/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { HOST_METADATA_GET_ROUTE } from '../../../../common/endpoint/constants';
import type { HostInfo } from '../../../../common/endpoint/types';
import { useHttp } from '../../../common/lib/kibana';
import { resolvePathVariables } from '../../../common/utils/resolve_path_variables';

interface HttpResponse {
  statusCode: number;
  message: string;
}

/**
 * Get info for a security solution endpoint host using the endpoint id (`agent.id`)
 * @param endpointId
 * @param options
 */
export const useGetEndpointDetails = (
  endpointId: string,
  options: UseQueryOptions<HostInfo, IHttpFetchError<HttpResponse>> = {}
): UseQueryResult<HostInfo, IHttpFetchError<HttpResponse>> => {
  const http = useHttp();

  return useQuery<HostInfo, IHttpFetchError<HttpResponse>>({
    queryKey: ['get-endpoint-host-info', endpointId],
    ...options,
    queryFn: () => {
      return http.get<HostInfo>(
        resolvePathVariables(HOST_METADATA_GET_ROUTE, { id: endpointId.trim() || 'undefined' }),
        { version: '2023-10-31' }
      );
    },
  });
};
