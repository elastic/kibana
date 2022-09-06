/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useHttp } from '../../../common/lib/kibana';
import type { HostInfo, MetadataListResponse } from '../../../../common/endpoint/types';
import { HOST_METADATA_LIST_ROUTE } from '../../../../common/endpoint/constants';

type GetEndpointsListResponse = Array<{
  id: HostInfo['metadata']['agent']['id'];
  name: HostInfo['metadata']['host']['hostname'];
}>;

/**
 * Get info for a security solution endpoint host using hostnames via kuery param
 * page and pageSize are fixed for showing 50 hosts at most on the 1st page
 * @param query
 * @param options
 */
export const useGetEndpointsList = (
  searchString: string,
  options: UseQueryOptions<GetEndpointsListResponse, IHttpFetchError> = {}
): UseQueryResult<GetEndpointsListResponse, IHttpFetchError> => {
  const http = useHttp();

  const kuery = `united.endpoint.host.hostname:${searchString.length ? `*${searchString}` : ''}*`;

  return useQuery<GetEndpointsListResponse, IHttpFetchError>({
    queryKey: ['get-endpoints-list', kuery],
    ...options,
    queryFn: async () => {
      const metadataListResponse = await http.get<MetadataListResponse>(HOST_METADATA_LIST_ROUTE, {
        query: {
          page: 0,
          pageSize: 50,
          kuery,
        },
      });

      return metadataListResponse.data.map((list) => ({
        id: list.metadata.agent.id,
        name: list.metadata.host.hostname,
      }));
    },
  });
};
