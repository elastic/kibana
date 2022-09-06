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
import { resolvePathVariables } from '../../../common/utils/resolve_path_variables';
import { ACTION_DETAILS_ROUTE } from '../../../../common/endpoint/constants';
import type { ActionDetailsApiResponse } from '../../../../common/endpoint/types';

export const useGetActionDetails = (
  actionId: string,
  options: UseQueryOptions<ActionDetailsApiResponse, HttpFetchError> = {}
): UseQueryResult<ActionDetailsApiResponse, HttpFetchError> => {
  const http = useHttp();

  return useQuery<ActionDetailsApiResponse, HttpFetchError>({
    queryKey: ['get-action-details', actionId],
    ...options,
    queryFn: () => {
      return http.get<ActionDetailsApiResponse>(
        resolvePathVariables(ACTION_DETAILS_ROUTE, { action_id: actionId.trim() || 'undefined' })
      );
    },
  });
};
