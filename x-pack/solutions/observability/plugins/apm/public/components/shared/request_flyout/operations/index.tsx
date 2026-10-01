/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiBasicTable, type EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DependencyOperation } from '@kbn/apm-api-shared';
import React from 'react';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../common/utils/formatters';
import { ImpactBar } from '../../impact_bar';
import { TransactionTab } from '../../../app/transaction_details/waterfall_with_summary/transaction_tabs';
import { DependencyOperationDetailLink } from '../../../app/dependency_operation_detail_view/dependency_operation_detail_link';
import { useRequestFlyoutContext } from '../request_flyout_context';
import { useRequestFlyoutOperations } from './use_request_flyout_operations';

/**
 * "Operations" tab in the edge flyout.
 *
 * Shows the exit-span operations from the source service to the target
 * dependency: the span type, name (link to operation detail page), call
 * latency, calls, failure rate and impact (time consumed share) — all
 * measured on the source side.
 *
 * Column names are unified with the Transactions tab:
 *   Type · Name · Avg time · Calls · Failed · Time consumed
 */
export function RequestFlyoutOperations() {
  const {
    connection: { sourceServiceName },
    filters: { environment, rangeFrom, rangeTo },
  } = useRequestFlyoutContext();

  const { items, isLoading, resolvedDependencyName } = useRequestFlyoutOperations();

  const columns: Array<EuiBasicTableColumn<DependencyOperation>> = [
    {
      field: 'spanType',
      name: i18n.translate('xpack.apm.requestFlyout.operations.column.spanType', {
        defaultMessage: 'Type',
      }),
      width: '100px',
      render: (spanType: string | undefined) =>
        spanType ? (
          <EuiBadge color="hollow">{spanType}</EuiBadge>
        ) : (
          <span>—</span>
        ),
    },
    {
      field: 'spanName',
      name: i18n.translate('xpack.apm.requestFlyout.operations.column.spanName', {
        defaultMessage: 'Name',
      }),
      truncateText: true,
      render: (spanName: string) => {
        if (!resolvedDependencyName) {
          // Service→service edges use span names as-is; no operation detail page link.
          return spanName;
        }
        return (
          <DependencyOperationDetailLink
            dependencyName={resolvedDependencyName}
            spanName={spanName}
            environment={environment}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            // Pre-scope to the source service so the page shows only this caller's data.
            kuery={`service.name : "${sourceServiceName}"`}
            comparisonEnabled={false}
            detailTab={TransactionTab.timeline}
            showCriticalPath={false}
          />
        );
      },
    },
    {
      field: 'latency',
      name: i18n.translate('xpack.apm.requestFlyout.operations.column.avgTime', {
        defaultMessage: 'Avg time',
      }),
      align: 'right' as const,
      render: (value: number | null) =>
        value == null ? '—' : asMillisecondDuration(value),
    },
    {
      field: 'throughput',
      name: i18n.translate('xpack.apm.requestFlyout.operations.column.calls', {
        defaultMessage: 'Calls',
      }),
      align: 'right' as const,
      render: (value: number) => asTransactionRate(value),
    },
    {
      field: 'failureRate',
      name: i18n.translate('xpack.apm.requestFlyout.operations.column.failed', {
        defaultMessage: 'Failed',
      }),
      align: 'right' as const,
      render: (value: number | null) => (value == null ? '—' : asPercent(value, 1)),
    },
    {
      field: 'impact',
      name: i18n.translate('xpack.apm.requestFlyout.operations.column.timeConsumed', {
        defaultMessage: 'Time consumed',
      }),
      align: 'right' as const,
      render: (value: number) => <ImpactBar value={value} size="m" />,
    },
  ];

  return (
    <section data-test-subj="requestFlyoutSection-operations">
      <EuiBasicTable
        columns={columns}
        items={items}
        loading={isLoading}
        noItemsMessage={
          isLoading
            ? i18n.translate('xpack.apm.requestFlyout.operations.loadingLabel', {
                defaultMessage: 'Loading operations…',
              })
            : i18n.translate('xpack.apm.requestFlyout.operations.noDataLabel', {
                defaultMessage: 'No operations found for this connection.',
              })
        }
        data-test-subj="requestFlyoutOperationsTable"
      />
    </section>
  );
}
