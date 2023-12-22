/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { resolvePathVariables } from '../../../common/utils/resolve_path_variables';
import { useHttp } from '../../../common/lib/kibana';

interface HttpResponse {
  statusCode: number;
  message: string;
}

// TODO: Update once we have API and data model for SentinelOne
// This is a placeholder for now
interface SentinelOneInfo {
  host: {
    name: string;
  };
  os: {
    name: string;
  };
  last_checkin: string;
}

// TODO: Update once we have API and data model for SentinelOne
export const useGetSentinelOneDetails = (
  endpointId: string,
  options: UseQueryOptions<SentinelOneInfo, IHttpFetchError<HttpResponse>> = {}
): UseQueryResult<SentinelOneInfo, IHttpFetchError<HttpResponse>> => {
  const http = useHttp();

  return useQuery<SentinelOneInfo, IHttpFetchError<HttpResponse>>({
    queryKey: ['get-third-party-host-info', endpointId],
    ...options,
    queryFn: () => {
      // TODO: Update once we have API and data model for SentinelOne
      return http.get<SentinelOneInfo>(
        // TODO: Update API PATH once we have API and data model for SentinelOne
        resolvePathVariables(`/api/thirdPartyHost/metadata/{id}`, {
          id: endpointId.trim() || 'undefined',
        }),
        {
          version: '2024-03-31',
        }
      );
    },
  });
};
