/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useQuery } from '@tanstack/react-query';
import { getFileDownloadId } from '../../../../common/endpoint/service/response_actions/get_file_download_id';
import { resolvePathVariables } from '../../../common/utils/resolve_path_variables';
import { useHttp } from '../../../common/lib/kibana/hooks';
import type {
  ActionDetails,
  ActionFileInfoApiResponse,
  MaybeImmutable,
} from '../../../../common/endpoint/types';
import { ACTION_AGENT_FILE_INFO_ROUTE } from '../../../../common/endpoint/constants';

/**
 * Retrieves information about a file that was uploaded by the endpoint as a result of a `get-file` action
 * @param action
 * @param [agentId] If left undefined, the first agent that the action was sent to will be used
 * @param [options]
 */
export const useGetFileInfo = (
  action: MaybeImmutable<ActionDetails>,
  agentId?: string,
  options: UseQueryOptions<ActionFileInfoApiResponse, IHttpFetchError> = {}
): UseQueryResult<ActionFileInfoApiResponse, IHttpFetchError> => {
  const http = useHttp();

  return useQuery<ActionFileInfoApiResponse, IHttpFetchError>({
    queryKey: ['get-action-file-info', action.id, agentId ?? action.agents[0]],
    ...options,
    queryFn: () => {
      const apiUrl = resolvePathVariables(ACTION_AGENT_FILE_INFO_ROUTE, {
        action_id: action.id,
        file_id: getFileDownloadId(action as ActionDetails, agentId),
      });

      return http.get<ActionFileInfoApiResponse>(apiUrl, { version: '2023-10-31' });
    },
  });
};
