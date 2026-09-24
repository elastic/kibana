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
    connection: { sourceServiceName, dependencies },
    filters: { environment, start, end },
    refreshToken,
  } = useRequestFlyoutContext();

  const { data, status } = useFetcher(
    (callApmApi) => {
      void refreshToken;
      if (sourceServiceName && dependencies.length > 0 && start && end) {
        return callApmApi('GET /internal/apm/service-map/connection/transactions', {
          params: {
            query: {
              sourceServiceName,
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
    [sourceServiceName, dependencies, environment, start, end, latencyAggregationType, refreshToken]
  );

  // Map the API response to the generic TransactionGroup shape the shared table expects.
  const items = useMemo<TransactionGroup[]>(
    () =>
      (data?.transactionGroups ?? []).map((group) => ({
        name: group.name,
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
