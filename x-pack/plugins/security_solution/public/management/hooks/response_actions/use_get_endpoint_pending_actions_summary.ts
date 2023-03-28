/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, isEmpty } from 'lodash';
import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { PendingActionsResponse } from '../../../../common/endpoint/types';
import { fetchPendingActionsByAgentId } from '../../../common/lib/endpoint_pending_actions';
import { DEFAULT_ENDPOINT_REFRESH_INTERVAL } from '../../components/endpoint_responder/lib/constants';
import { useEndpointSelector } from '../../pages/endpoint_hosts/view/hooks';
import { autoRefreshInterval } from '../../pages/endpoint_hosts/store/selectors';

/**
 * Retrieves the pending actions against the given Endpoint `agent.id`'s
 * @param endpointAgentIds
 * @param options
 */
export const useGetEndpointPendingActionsSummary = <T = PendingActionsResponse>(
  endpointAgentIds: string[],
  options: UseQueryOptions<PendingActionsResponse, IHttpFetchError, T, string[]> = {}
) => {
  const endpointIds = compact(endpointAgentIds);
  const autoRefetchIntervalValue = useEndpointSelector(autoRefreshInterval);
  const enabled = options.enabled ?? !isEmpty(endpointIds);

  return useQuery<PendingActionsResponse, IHttpFetchError, T, string[]>(
    ['fetch-endpoint-pending-actions-summary', ...endpointIds],
    () => fetchPendingActionsByAgentId(endpointIds),
    {
      refetchInterval: autoRefetchIntervalValue ?? DEFAULT_ENDPOINT_REFRESH_INTERVAL,
      ...options,
      enabled,
      placeholderData: { data: [] },
    }
  );
};
