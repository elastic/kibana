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

/**
 * The failed calls of the connection, by where they failed.
 *
 * For service → dependency edges there is a single `dependency` bucket. For service → service
 * edges there are up to three:
 * - `caller`: the request never reached the target (timeout, connection error);
 * - `server`: the target received the request and failed (5xx, gRPC INTERNAL);
 * - `client`: the target answered with a client error (4xx, gRPC INVALID_ARGUMENT).
 *
 * The calls are the exit spans to the resources of the connection: without resources (an edge
 * whose destination is unknown) there is nothing to look for, and `isApplicable` is false.
 */
export function useRequestFlyoutFailedCalls() {
  const {
    connection: { sourceServiceName, targetServiceName, dependencyName, dependencies },
    filters: { environment, start, end },
  } = useRequestFlyoutContext();

  // A service → dependency edge is about its own dependency; a service → service edge may reach
  // the target through several resources.
  const resources = useMemo(
    () => (!targetServiceName && dependencyName ? [dependencyName] : dependencies),
    [targetServiceName, dependencyName, dependencies]
  );
  const isApplicable = resources.length > 0;

  const { data, status } = useRequestFlyoutFetcher(
    (callApmApi) => {
      if (!isApplicable) {
        return;
      }
      return callApmApi('GET /internal/apm/service-map/connection/failed_calls', {
        params: {
          query: {
            sourceServiceName,
            targetServiceName,
            dependencies: resources,
            environment,
            start,
            end,
          },
        },
      });
    },
    [isApplicable, sourceServiceName, targetServiceName, resources, environment, start, end]
  );

  const buckets = useMemo(() => data?.buckets ?? [], [data]);

  return {
    buckets,
    totalFailed: data?.totalFailed ?? 0,
    totalCalls: data?.totalCalls ?? 0,
    isSampled: data?.isSampled ?? false,
    isApplicable,
    isLoading: isApplicable && isPending(status),
    hasError: status === FETCH_STATUS.FAILURE,
  };
}
