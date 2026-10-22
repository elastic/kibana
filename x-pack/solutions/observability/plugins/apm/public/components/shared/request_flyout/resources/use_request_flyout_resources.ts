/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { FETCH_STATUS, isPending } from '../../../../hooks/use_fetcher';
import { useRequestFlyoutFetcher } from '../use_request_flyout_fetcher';
import { useRequestFlyoutContext } from '../request_flyout_context';
import { getTopResources } from './get_top_resources';

/** Number of resources of a grouped edge shown in the table. */
export const MAX_RESOURCES_SHOWN = 10;

/**
 * The resources of a grouped edge with their stats, most time consumed first. The dependencies
 * route is narrowed to the group on the client; `numBuckets: 1` keeps its unused timeseries small.
 */
export function useRequestFlyoutResources() {
  const {
    connection: { sourceServiceName, groupedResources },
    filters: { environment, start, end },
  } = useRequestFlyoutContext();

  const { data, status } = useRequestFlyoutFetcher(
    (callApmApi) =>
      callApmApi('GET /internal/apm/services/{serviceName}/dependencies', {
        params: {
          path: { serviceName: sourceServiceName },
          query: { environment, start, end, numBuckets: 1 },
        },
      }),
    [sourceServiceName, environment, start, end]
  );

  const resources = useMemo(
    () =>
      getTopResources({
        dependencies: data?.serviceDependencies ?? [],
        groupedResources: groupedResources ?? [],
      }),
    [data, groupedResources]
  );

  return {
    items: useMemo(() => resources.slice(0, MAX_RESOURCES_SHOWN), [resources]),
    totalResources: groupedResources?.length ?? 0,
    isLoading: isPending(status),
    hasError: status === FETCH_STATUS.FAILURE,
  };
}
