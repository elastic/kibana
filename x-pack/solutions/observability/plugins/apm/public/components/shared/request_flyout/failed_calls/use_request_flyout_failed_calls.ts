/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useRequestFlyoutContext } from '../request_flyout_context';

/**
 * Fetches the "failed calls by where they failed" data for the edge flyout.
 *
 * For service→dependency edges the result has a single 'dependency' bucket.
 * For service→service edges the result has up to three buckets:
 *   - 'caller':  request never reached the target (timeout / connection error)
 *   - 'server':  target received the request but returned a server-side error
 *   - 'client':  target returned a client error (4xx / INVALID_ARGUMENT)
 */
export function useRequestFlyoutFailedCalls() {
  const {
    connection: { sourceServiceName, targetServiceName, dependencyName, dependencies },
    filters: { environment, start, end },
  } = useRequestFlyoutContext();

  // Resolve to a stable scalar key for the dependency filter.
  // For service→dependency edges the resource name is a string (dependencyName
  // or the first entry in dependencies). For service→service edges we pass the
  // full dependencies array — but we need a stable cache key so we join it.
  // Using array literals like [dependencyName] in the useFetcher dep array
  // creates a new reference on every render and causes an infinite loop.
  const resolvedDependencyName: string | undefined = targetServiceName
    ? undefined
    : dependencyName ?? dependencies[0];

  // Stable string key for the dep array. The actual param sent to the API is
  // derived inside the callback where we can safely reconstruct the array.
  const dependenciesKey = targetServiceName ? dependencies.join(',') : resolvedDependencyName ?? '';

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (sourceServiceName && start && end) {
        // Reconstruct the dependencies array inside the callback only.
        const depsParam: string[] | undefined = targetServiceName
          ? dependencies.length > 0
            ? dependencies
            : undefined
          : resolvedDependencyName
          ? [resolvedDependencyName]
          : undefined;

        return callApmApi('GET /internal/apm/service-map/connection/failed_calls', {
          params: {
            query: {
              sourceServiceName,
              targetServiceName,
              dependencies: depsParam,
              environment,
              start,
              end,
            },
          },
        });
      }
    },
    // Use scalar values only — no array literals that would change reference each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sourceServiceName, targetServiceName, dependenciesKey, environment, start, end]
  );

  return {
    buckets: data?.buckets ?? [],
    totalFailed: data?.totalFailed ?? 0,
    totalCalls: data?.totalCalls ?? 0,
    isSampled: data?.isSampled ?? false,
    isLoading: isPending(status),
  };
}
