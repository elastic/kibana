/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransactionsTable } from '@kbn/apm-ui-shared';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { useRequestFlyoutTransactions } from './use_request_flyout_transactions';

/**
 * Transaction groups in the source service that call the target connection.
 * Each group is derived from a two-phase join: exit spans → transaction docs.
 *
 * PoC concern #1: the join is capped at 1 000 unique transaction IDs, so
 * throughput / error rate values may be biased on high-volume connections.
 */
export function RequestFlyoutTransactions({
  latencyAggregationType,
}: {
  latencyAggregationType: LatencyAggregationType;
}) {
  const { items, isLoading, isMaxTransactionsReached } = useRequestFlyoutTransactions({
    latencyAggregationType,
  });

  return (
    <section data-test-subj="requestFlyoutSection-transactions">
      <TransactionsTable
        items={items}
        isLoading={isLoading}
        maxCountExceeded={isMaxTransactionsReached}
        showMaxTransactionGroupsExceededWarning
        latencyAggregationType={latencyAggregationType}
        showSparklines={false}
        title={i18n.translate('xpack.apm.requestFlyout.transactions.title', {
          defaultMessage: 'Upstream transactions',
        })}
        data-test-subj="requestFlyoutTransactionsTable"
      />
    </section>
  );
}
