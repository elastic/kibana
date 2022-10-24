/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useQuery } from '@tanstack/react-query';
import { useHttp } from '../../../common/lib/kibana/hooks';
import { getHostActionFileInfoUrl } from '../../services/response_actions/get_host_action_file_info_url';
import type {
  ActionDetails,
  ActionFileInfoApiResponse,
  MaybeImmutable,
} from '../../../../common/endpoint/types';

/**
 * Retrieves information about a file that was uploaded by the endpoint as a result of a `get-file` action
 * @param action
 * @param options
 */
export const useGetFileInfo = (
  action: MaybeImmutable<ActionDetails>,
  options: UseQueryOptions<ActionFileInfoApiResponse, IHttpFetchError> = {}
): UseQueryResult<ActionFileInfoApiResponse, IHttpFetchError> => {
  const http = useHttp();

  return useQuery<ActionFileInfoApiResponse, IHttpFetchError>({
    queryKey: ['get-action-file-info', action.id],
    ...options,
    queryFn: () => {
      return http.get<ActionFileInfoApiResponse>(getHostActionFileInfoUrl(action));
    },
  });
};
