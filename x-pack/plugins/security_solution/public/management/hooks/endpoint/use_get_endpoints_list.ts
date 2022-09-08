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
  selected: boolean;
}>;

/**
 * Get info for a security solution endpoint host using hostnames via kuery param
 * page and pageSize are fixed for showing 50 hosts at most on the 1st page
 * @param query
 * @param options
 */
export const useGetEndpointsList = ({
  searchString,
  selectedAgentIds,
  options = {},
}: {
  searchString: string;
  selectedAgentIds?: string[];
  options?: UseQueryOptions<GetEndpointsListResponse, IHttpFetchError>;
}): UseQueryResult<GetEndpointsListResponse, IHttpFetchError> => {
  const http = useHttp();
  const kuery = `united.endpoint.host.hostname:${searchString.length ? `*${searchString}` : ''}*`;
  let agentIdsKuery: string[] = [];
  if (selectedAgentIds) {
    agentIdsKuery = selectedAgentIds.map((id) => `united.endpoint.agent.id:"${id}"`);
  }

  return useQuery<GetEndpointsListResponse, IHttpFetchError>({
    queryKey: ['get-endpoints-list', kuery],
    ...options,
    queryFn: async () => {
      const metadataListResponse = await http.get<MetadataListResponse>(HOST_METADATA_LIST_ROUTE, {
        query: {
          page: 0,
          pageSize: 50,
          kuery: [...agentIdsKuery, kuery].join(' or '),
        },
      });

      return metadataListResponse.data.map((list) => ({
        id: list.metadata.agent.id,
        name: list.metadata.host.hostname,
        selected: selectedAgentIds?.includes(list.metadata.agent.id) ?? false,
      }));
    },
  });
};
