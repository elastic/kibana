/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryObserverResult, useQuery, UseQueryOptions } from 'react-query';
import type { HttpFetchError } from '@kbn/core/public';
import { resolvePathVariables } from '../../../common/utils/resolve_path_variables';
import { useHttp } from '../../../common/lib/kibana';
import type { HostInfo } from '../../../../common/endpoint/types';
import { HOST_METADATA_GET_ROUTE } from '../../../../common/endpoint/constants';

/**
 * Get info for a security solution endpoint host using the endpoint id (`agent.id`)
 * @param endpointId
 * @param options
 */
export const useGetEndpointHostInfo = (
  endpointId: string,
  options: UseQueryOptions<HostInfo, HttpFetchError> = {}
): QueryObserverResult<HostInfo, HttpFetchError> => {
  const http = useHttp();

  return useQuery<HostInfo, HttpFetchError>(
    ['get-endpoint-host-info', endpointId],
    () => {
      return http.get<HostInfo>(
        resolvePathVariables(HOST_METADATA_GET_ROUTE, { id: endpointId ?? 'undefined' })
      );
    },
    {
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      ...options,
    }
  );
};
