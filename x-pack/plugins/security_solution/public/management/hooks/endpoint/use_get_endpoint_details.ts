/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { isEndpointHostIsolated } from '../../../common/utils/validators';
import { resolvePathVariables } from '../../../common/utils/resolve_path_variables';
import { useHttp } from '../../../common/lib/kibana';
import type { HostInfo } from '../../../../common/endpoint/types';
import { HostStatus } from '../../../../common/endpoint/types';
import { HOST_METADATA_GET_ROUTE } from '../../../../common/endpoint/constants';
import { DEFAULT_ENDPOINT_REFRESH_INTERVAL } from '../../components/endpoint_responder/lib/constants';

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
  options: UseQueryOptions<
    HostInfo,
    IHttpFetchError<HttpResponse>,
    HostInfo & {
      isIsolated: boolean;
      capabilities: HostInfo['metadata']['Endpoint']['capabilities'];
      agentStatus: HostInfo['host_status'];
    }
  > = {}
): UseQueryResult<
  HostInfo & {
    isIsolated: boolean;
    capabilities: HostInfo['metadata']['Endpoint']['capabilities'];
    agentStatus: HostInfo['host_status'];
  },
  IHttpFetchError<HttpResponse>
> => {
  const http = useHttp();

  return useQuery<
    HostInfo,
    IHttpFetchError<HttpResponse>,
    HostInfo & {
      isIsolated: boolean;
      capabilities: HostInfo['metadata']['Endpoint']['capabilities'];
      agentStatus: HostInfo['host_status'];
    }
  >(
    ['get-endpoint-host-info', endpointId],
    () =>
      http.get<HostInfo>(
        resolvePathVariables(HOST_METADATA_GET_ROUTE, { id: endpointId.trim() || 'undefined' })
      ),
    {
      refetchInterval: DEFAULT_ENDPOINT_REFRESH_INTERVAL,
      select: (data) => ({
        ...data,
        capabilities: data?.metadata.Endpoint.capabilities,
        isIsolated: isEndpointHostIsolated(data?.metadata),
        agentStatus: data?.host_status ?? HostStatus.UNENROLLED,
      }),
      ...options,
    }
  );
};
