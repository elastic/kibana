/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectionTransactionGroup } from '@kbn/apm-api-shared';
import { useMemo } from 'react';
import { FETCH_STATUS, isPending } from '../../../../hooks/use_fetcher';
import { useRequestFlyoutFetcher } from '../use_request_flyout_fetcher';
import { useRequestFlyoutContext } from '../request_flyout_context';

export type { ConnectionTransactionGroup };

/** Transactions of the source service that call the target of the connection. */
export function useRequestFlyoutTransactions() {
  const {
    connection: { sourceServiceName, targetServiceName, dependencies },
    filters: { environment, start, end },
  } = useRequestFlyoutContext();

  // A connection is scoped by its target service or by its resources.
  const isApplicable = Boolean(targetServiceName) || dependencies.length > 0;

  const { data, status } = useRequestFlyoutFetcher(
    (callApmApi) => {
      if (!isApplicable) {
        return;
      }
      return callApmApi('GET /internal/apm/service-map/connection/transactions', {
        params: {
          query: { sourceServiceName, targetServiceName, dependencies, environment, start, end },
        },
      });
    },
    [isApplicable, sourceServiceName, targetServiceName, dependencies, environment, start, end]
  );

  const items = useMemo(() => data?.transactionGroups ?? [], [data]);

  return {
    items,
    isLoading: isApplicable && isPending(status),
    hasError: status === FETCH_STATUS.FAILURE,
    isSampled: data?.isSampled ?? false,
  };
}
