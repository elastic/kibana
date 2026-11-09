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

/** The operations of the source service on the dependency: its exit spans, grouped by name. */
export function useRequestFlyoutOperations() {
  const {
    connection: { sourceServiceName, dependencyName, dependencies },
    filters: { environment, start, end },
  } = useRequestFlyoutContext();

  // The operations route takes a single dependency.
  const resolvedDependencyName = dependencyName ?? dependencies[0];

  const { data, status } = useRequestFlyoutFetcher(
    (callApmApi) => {
      if (!resolvedDependencyName) {
        return;
      }
      return callApmApi('GET /internal/apm/dependencies/operations', {
        params: {
          query: {
            dependencyName: resolvedDependencyName,
            serviceName: sourceServiceName,
            environment,
            start,
            end,
            kuery: '',
          },
        },
      });
    },
    [resolvedDependencyName, sourceServiceName, environment, start, end]
  );

  const items = useMemo(() => data?.operations ?? [], [data]);

  return {
    items,
    dependencyName: resolvedDependencyName,
    isLoading: Boolean(resolvedDependencyName) && isPending(status),
    hasError: status === FETCH_STATUS.FAILURE,
  };
}
