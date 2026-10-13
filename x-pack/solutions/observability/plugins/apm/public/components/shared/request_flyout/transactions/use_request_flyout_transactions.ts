/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { TransactionGroup } from '@kbn/apm-ui-shared';
import { isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useRequestFlyoutContext } from '../request_flyout_context';
import type { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';

export function useRequestFlyoutTransactions({
  latencyAggregationType,
}: {
  latencyAggregationType: LatencyAggregationType;
}) {
  const {
    connection: { sourceServiceName, targetServiceName, dependencies },
    filters: { environment, start, end },
    refreshToken,
  } = useRequestFlyoutContext();

  const { data, status } = useFetcher(
    (callApmApi) => {
      void refreshToken;
      // For service→service edges targetServiceName is the join key (trace-based).
      // For service→dependency edges we join on resource names from dependencies[].
      // We require at least one of the two to avoid querying all transactions.
      const hasTarget = Boolean(targetServiceName) || dependencies.length > 0;
      if (sourceServiceName && hasTarget && start && end) {
        return callApmApi('GET /internal/apm/service-map/connection/transactions', {
          params: {
            query: {
              sourceServiceName,
              targetServiceName,
              dependencies,
              environment,
              start,
              end,
              latencyAggregationType,
            },
          },
        });
      }
    },
    [
      sourceServiceName,
      targetServiceName,
      dependencies,
      environment,
      start,
      end,
      latencyAggregationType,
      refreshToken,
    ]
  );

  // Map the API response to the generic TransactionGroup shape the shared table expects.
  const items = useMemo<TransactionGroup[]>(
    () =>
      (data?.transactionGroups ?? []).map((group) => ({
        name: group.name,
        transactionType: group.transactionType,
        latency: { value: group.latency },
        throughput: { value: group.throughput },
        errorRate: { value: group.errorRate },
      })),
    [data?.transactionGroups]
  );

  return {
    items,
    isLoading: isPending(status),
    isMaxTransactionsReached: data?.isMaxTransactionsReached ?? false,
  };
}
