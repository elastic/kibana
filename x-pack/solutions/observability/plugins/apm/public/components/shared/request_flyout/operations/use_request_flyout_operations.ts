/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useRequestFlyoutContext } from '../request_flyout_context';

/**
 * Fetches the operations (exit-span aggregation) for the source service's
 * calls to the target dependency. The `serviceName` filter scopes results to
 * the source service only, matching the design requirement that the Operations
 * tab shows what s1 calls on d1 (not all callers of d1).
 */
export function useRequestFlyoutOperations() {
  const {
    connection: { sourceServiceName, dependencyName, dependencies },
    filters: { environment, start, end },
  } = useRequestFlyoutContext();

  // For service→dependency edges dependencyName comes from the target node's
  // SPAN_DESTINATION_SERVICE_RESOURCE. For service→service edges the target
  // node is a service node (no resource field), so dependencyName is undefined —
  // fall back to the first entry in the resources array from the edge.
  const resolvedDependencyName = dependencyName ?? dependencies[0];

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (sourceServiceName && resolvedDependencyName && start && end) {
        return callApmApi('GET /internal/apm/dependencies/operations', {
          params: {
            query: {
              dependencyName: resolvedDependencyName,
              environment,
              start,
              end,
              kuery: '',
              serviceName: sourceServiceName,
            },
          },
        });
      }
    },
    [sourceServiceName, resolvedDependencyName, environment, start, end]
  );

  return {
    items: data?.operations ?? [],
    isLoading: isPending(status),
    resolvedDependencyName,
  };
}
