/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransactionsTable } from '@kbn/apm-ui-shared';
import type { TransactionGroup } from '@kbn/apm-ui-shared';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';
import type { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { TransactionDetailFlyout } from '../../transaction_detail_flyout';
import { useRequestFlyoutContext } from '../request_flyout_context';
import { useRequestFlyoutTransactions } from './use_request_flyout_transactions';

/**
 * Transaction groups in the source service that call the target connection.
 * Each group is derived from a two-phase join: exit spans → transaction docs.
 * Clicking a row opens a nested TransactionDetailFlyout for the selected group.
 *
 * PoC concern #1: the join is capped at 1 000 unique transaction IDs, so
 * throughput / error rate values may be biased on high-volume connections.
 */
export function RequestFlyoutTransactions({
  latencyAggregationType,
}: {
  latencyAggregationType: LatencyAggregationType;
}) {
  const {
    deps,
    connection: { sourceServiceName },
    filters: { environment, rangeFrom, rangeTo, start, end },
    refreshToken,
  } = useRequestFlyoutContext();

  const { items, isLoading, isMaxTransactionsReached } = useRequestFlyoutTransactions({
    latencyAggregationType,
  });

  const [selectedTransaction, setSelectedTransaction] = useState<{
    name: string;
    transactionType: string;
  } | null>(null);

  const onTransactionClick = useCallback((item: TransactionGroup) => {
    const txType = item.transactionType ?? '';
    if (!txType) {
      return;
    }
    setSelectedTransaction((prev) => {
      if (prev?.name === item.name && prev.transactionType === txType) {
        return null;
      }
      return { name: item.name, transactionType: txType };
    });
  }, []);

  const isTransactionExpanded = useCallback(
    (item: TransactionGroup) => {
      if (!selectedTransaction) return false;
      return (
        selectedTransaction.name === item.name &&
        selectedTransaction.transactionType === (item.transactionType ?? '')
      );
    },
    [selectedTransaction]
  );

  return (
    <>
      <section data-test-subj="requestFlyoutSection-transactions">
        <TransactionsTable
          items={items}
          isLoading={isLoading}
          maxCountExceeded={isMaxTransactionsReached}
          showMaxTransactionGroupsExceededWarning
          latencyAggregationType={latencyAggregationType}
          showSparklines={false}
          columnInteractions={{
            name: {
              onClick: onTransactionClick,
              isExpanded: isTransactionExpanded,
            },
          }}
          title={i18n.translate('xpack.apm.requestFlyout.transactions.title', {
            defaultMessage: 'Upstream transactions',
          })}
          data-test-subj="requestFlyoutTransactionsTable"
        />
      </section>
      {selectedTransaction && (
        <TransactionDetailFlyout
          deps={deps}
          filters={{
            serviceName: sourceServiceName,
            transactionName: selectedTransaction.name,
            transactionType: selectedTransaction.transactionType,
            environment,
            rangeFrom,
            rangeTo,
            start,
            end,
          }}
          refreshToken={refreshToken}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </>
  );
}
