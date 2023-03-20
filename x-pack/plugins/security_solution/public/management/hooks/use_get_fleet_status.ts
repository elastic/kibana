/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { AGENTS_SETUP_API_ROUTES } from '@kbn/fleet-plugin/common';
import type { GetFleetStatusResponse } from '@kbn/fleet-plugin/common/types';
import { useHttp } from '../../common/lib/kibana';

/**
 * Get info for fleet status
 * @param options
 */
export const useGetFleetStatus = (
  options: UseQueryOptions<GetFleetStatusResponse, IHttpFetchError> = {}
): UseQueryResult<GetFleetStatusResponse, IHttpFetchError> => {
  const http = useHttp();

  return useQuery<GetFleetStatusResponse, IHttpFetchError>({
    queryKey: ['get-fleet-status'],
    ...options,
    queryFn: () => {
      return http.get<GetFleetStatusResponse>(AGENTS_SETUP_API_ROUTES.INFO_PATTERN);
    },
  });
};
