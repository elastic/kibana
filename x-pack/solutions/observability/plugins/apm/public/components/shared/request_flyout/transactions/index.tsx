/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiCallOut,
  EuiSpacer,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';
import { asMillisecondDuration, asPercent } from '../../../../../common/utils/formatters';
import { ImpactBar } from '../../impact_bar';
import { TransactionDetailFlyout } from '../../transaction_detail_flyout';
import { useRequestFlyoutContext } from '../request_flyout_context';
import { useRequestFlyoutTransactions } from './use_request_flyout_transactions';
import type { ConnectionTransactionGroup } from './use_request_flyout_transactions';

/**
 * "Affected endpoints" tab in the edge flyout.
 *
 * Shows source-service transaction groups that directly call the target.
 * All metrics (call latency, calls, failed) are measured from the exit spans,
 * NOT from the full transaction duration — so latency here means "time spent
 * calling the target", not "transaction response time".
 */
export function RequestFlyoutAffectedEndpoints() {
  const {
    deps,
    connection: { sourceServiceName, targetLabel },
    filters: { environment, rangeFrom, rangeTo, start, end },
  } = useRequestFlyoutContext();

  const { items, isLoading, isMaxTransactionsReached } = useRequestFlyoutTransactions();

  const [selectedTransaction, setSelectedTransaction] = useState<{
    name: string;
    transactionType: string;
  } | null>(null);

  const onRowClick = useCallback((item: ConnectionTransactionGroup) => {
    if (!item.transactionType) return;
    setSelectedTransaction((prev) =>
      prev?.name === item.name && prev.transactionType === item.transactionType
        ? null
        : { name: item.name, transactionType: item.transactionType }
    );
  }, []);

  const columns: Array<EuiBasicTableColumn<ConnectionTransactionGroup>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.apm.requestFlyout.affectedEndpoints.column.transaction', {
        defaultMessage: 'Transaction',
      }),
      truncateText: true,
      render: (name: string) => (
        <EuiText size="s" style={{ cursor: 'pointer' }}>
          {name}
        </EuiText>
      ),
    },
    {
      field: 'avgCallLatency',
      name: i18n.translate('xpack.apm.requestFlyout.affectedEndpoints.column.avgCallLatency', {
        defaultMessage: 'Avg time in {target} calls',
        values: { target: targetLabel },
      }),
      align: 'right' as const,
      render: (value: number | null) =>
        value == null
          ? '—'
          : asMillisecondDuration(value),
    },
    {
      field: 'callCount',
      name: i18n.translate('xpack.apm.requestFlyout.affectedEndpoints.column.calls', {
        defaultMessage: 'Calls to {target}',
        values: { target: targetLabel },
      }),
      align: 'right' as const,
      render: (value: number) => value.toLocaleString(),
    },
    {
      field: 'failedCallRate',
      name: i18n.translate('xpack.apm.requestFlyout.affectedEndpoints.column.failed', {
        defaultMessage: 'Failed',
      }),
      align: 'right' as const,
      render: (value: number | null) => (value == null ? '—' : asPercent(value, 1)),
    },
    {
      field: 'timeConsumedPct',
      name: i18n.translate('xpack.apm.requestFlyout.affectedEndpoints.column.timeConsumed', {
        defaultMessage: 'Time consumed',
      }),
      align: 'right' as const,
      render: (value: number | null) =>
        value == null ? '—' : <ImpactBar value={value * 100} size="m" />,
    },
  ];

  return (
    <>
      {isMaxTransactionsReached && (
        <>
          <EuiCallOut
            size="s"
            color="warning"
            iconType="warning"
            title={i18n.translate(
              'xpack.apm.requestFlyout.affectedEndpoints.maxTransactionsWarning',
              {
                defaultMessage:
                  'Not all transactions are shown. Results are based on a sample of {max} calls.',
                values: { max: '1 000' },
              }
            )}
          />
          <EuiSpacer size="s" />
        </>
      )}
      <section data-test-subj="requestFlyoutSection-affectedEndpoints">
        <EuiBasicTable
          columns={columns}
          items={items}
          loading={isLoading}
          noItemsMessage={
            isLoading
              ? i18n.translate('xpack.apm.requestFlyout.affectedEndpoints.loadingLabel', {
                  defaultMessage: 'Loading endpoints…',
                })
              : i18n.translate('xpack.apm.requestFlyout.affectedEndpoints.noDataLabel', {
                  defaultMessage: 'No transactions found between these services.',
                })
          }
          rowProps={(item) => ({
            onClick: () => onRowClick(item),
            'data-test-subj': `affectedEndpointRow-${item.name}`,
          })}
          data-test-subj="requestFlyoutAffectedEndpointsTable"
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
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </>
  );
}
