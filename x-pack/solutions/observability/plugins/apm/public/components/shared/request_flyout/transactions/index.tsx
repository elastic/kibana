/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, EuiSpacer, type EuiBasicTableColumn } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { REQUEST_FLYOUT_EBT_ELEMENTS } from '../ebt_constants';
import { ExpandableNameCell } from '../expandable_name_cell';
import { useRequestFlyoutChild } from '../request_flyout_child';
import { useRequestFlyoutContext } from '../request_flyout_context';
import {
  getAvgTimeColumn,
  getCallRateColumn,
  getFailureRateColumn,
  getTimeConsumedColumn,
  getViewTracesColumn,
} from '../table_columns';
import { useDiscoverHrefBuilder } from '../use_discover_href_builder';
import { useTablePagination } from '../use_table_pagination';
import {
  useRequestFlyoutTransactions,
  type ConnectionTransactionGroup,
} from './use_request_flyout_transactions';

/**
 * Transactions of the source service that call the target (service → service edges).
 *
 * The metrics (call latency, calls, failed) are the ones of the exit spans of the calls, not of
 * the whole transaction. The name opens the transaction in a child flyout.
 */
export function RequestFlyoutTransactions() {
  const { toggleChild, isChildSelected } = useRequestFlyoutChild();
  const {
    connection: { sourceServiceName },
    filters: { environment },
  } = useRequestFlyoutContext();
  const { items, isLoading, hasError, isSampled } = useRequestFlyoutTransactions();
  const { pageItems, pagination, onTableChange } = useTablePagination(items);
  const getDiscoverHref = useDiscoverHrefBuilder();

  const columns: Array<EuiBasicTableColumn<ConnectionTransactionGroup>> = useMemo(
    () => [
      {
        field: 'name',
        width: '38%',
        name: i18n.translate('xpack.apm.requestFlyout.transactions.column.name', {
          defaultMessage: 'Name',
        }),
        render: (name: string, { transactionType }: ConnectionTransactionGroup) => {
          // The transaction type is needed to open the transaction.
          if (!transactionType) {
            return name;
          }
          const child = { kind: 'transaction' as const, name, transactionType };
          return (
            <ExpandableNameCell
              data-test-subj="requestFlyoutTransactionNameLink"
              ebtElement={REQUEST_FLYOUT_EBT_ELEMENTS.TRANSACTION_NAME}
              name={name}
              isExpanded={isChildSelected(child)}
              onToggle={() => toggleChild(child)}
            />
          );
        },
      },
      getAvgTimeColumn('avgCallLatency'),
      getCallRateColumn('callRate'),
      getFailureRateColumn('failedCallRate'),
      getTimeConsumedColumn('timeConsumedPct', { isFraction: true }),
      getViewTracesColumn({
        getRowId: ({ name }) => `requestFlyoutTransactionActions-${name}`,
        getHref: ({ name, transactionType }) =>
          getDiscoverHref({
            serviceName: sourceServiceName,
            transactionName: name,
            transactionType,
            environment,
            sortDirection: 'DESC',
          }),
      }),
    ],
    [isChildSelected, toggleChild, getDiscoverHref, sourceServiceName, environment]
  );

  return (
    <>
      {isSampled && (
        <>
          <KbnWarningCallout
            size="s"
            title={i18n.translate('xpack.apm.requestFlyout.transactions.sampleWarning', {
              defaultMessage:
                'Not all transactions are shown. The most recent calls of the target are used.',
            })}
          />
          <EuiSpacer size="s" />
        </>
      )}
      <section data-test-subj="requestFlyoutSection-transactions">
        <EuiBasicTable
          columns={columns}
          items={pageItems}
          loading={isLoading}
          error={
            hasError
              ? i18n.translate('xpack.apm.requestFlyout.transactions.errorLabel', {
                  defaultMessage: 'Unable to load the transactions of this connection.',
                })
              : undefined
          }
          noItemsMessage={
            isLoading
              ? i18n.translate('xpack.apm.requestFlyout.transactions.loadingLabel', {
                  defaultMessage: 'Loading transactions…',
                })
              : i18n.translate('xpack.apm.requestFlyout.transactions.noDataLabel', {
                  defaultMessage: 'No transactions found between these services.',
                })
          }
          pagination={pagination}
          onChange={onTableChange}
          rowProps={() => ({ 'data-test-subj': 'requestFlyoutTransactionRow' })}
          tableCaption={i18n.translate('xpack.apm.requestFlyout.transactions.tableCaption', {
            defaultMessage: 'Transactions of the source service that call the target',
          })}
          data-test-subj="requestFlyoutTransactionsTable"
        />
      </section>
    </>
  );
}
