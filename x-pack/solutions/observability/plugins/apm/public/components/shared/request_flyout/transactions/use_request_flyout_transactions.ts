/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useRequestFlyoutContext } from '../request_flyout_context';
import type { ConnectionTransactionGroup } from '@kbn/apm-api-shared';

export type { ConnectionTransactionGroup };

export function useRequestFlyoutTransactions() {
  const {
    connection: { sourceServiceName, targetServiceName, dependencies },
    filters: { environment, start, end },
  } = useRequestFlyoutContext();

  const { data, status } = useFetcher(
    (callApmApi) => {
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
            },
          },
        });
      }
    },
    [sourceServiceName, targetServiceName, dependencies, environment, start, end]
  );

  return {
    items: data?.transactionGroups ?? [],
    isLoading: isPending(status),
    isMaxTransactionsReached: data?.isMaxTransactionsReached ?? false,
  };
}
