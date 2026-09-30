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
    connection: { sourceServiceName, dependencyName },
    filters: { environment, start, end },
  } = useRequestFlyoutContext();

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (sourceServiceName && dependencyName && start && end) {
        return callApmApi('GET /internal/apm/dependencies/operations', {
          params: {
            query: {
              dependencyName,
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
    [sourceServiceName, dependencyName, environment, start, end]
  );

  return {
    items: data?.operations ?? [],
    isLoading: isPending(status),
  };
}
