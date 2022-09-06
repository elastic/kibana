/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryObserverResult, UseQueryOptions, useQuery } from 'react-query';
import { HttpFetchError } from '@kbn/core/public';
import { PendingActionsResponse } from '../../../../common/endpoint/types';
import { fetchPendingActionsByAgentId } from '../../../common/lib/endpoint_pending_actions';

/**
 * Retrieves the pending actions against the given Endpoint `agent.id`'s
 * @param endpointAgentIds
 * @param options
 */
export const useGetEndpointPendingActionsSummary = (
  endpointAgentIds: string[],
  options: UseQueryOptions<PendingActionsResponse, HttpFetchError> = {}
): QueryObserverResult<PendingActionsResponse, HttpFetchError> => {
  return useQuery<PendingActionsResponse, HttpFetchError>({
    queryKey: ['fetch-endpoint-pending-actions-summary', ...endpointAgentIds],
    ...options,
    queryFn: () => fetchPendingActionsByAgentId(endpointAgentIds),
  });
};
