/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from 'react-query';
import type { HttpFetchError } from '@kbn/core/public';
import { useQuery } from 'react-query';
import { useHttp } from '../../../common/lib/kibana';
import { HOST_METADATA_LIST_ROUTE } from '../../../../common/endpoint/constants';
import type { MetadataListResponse } from '../../../../common/endpoint/types';

export const useGetEndpointsMetadata = (
  options: UseQueryOptions<MetadataListResponse, HttpFetchError> = {}
): UseQueryResult<MetadataListResponse, HttpFetchError> => {
  const http = useHttp();

  return useQuery<MetadataListResponse, HttpFetchError>({
    queryKey: ['get-endpoints-metadata'],
    ...options,
    queryFn: () => {
      return http.get<MetadataListResponse>(HOST_METADATA_LIST_ROUTE);
    },
  });
};
