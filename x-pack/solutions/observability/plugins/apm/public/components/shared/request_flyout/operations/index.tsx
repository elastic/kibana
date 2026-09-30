/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, type EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DependencyOperation } from '@kbn/apm-api-shared';
import React from 'react';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../common/utils/formatters';
import { ImpactBar } from '../../impact_bar';
import { useRequestFlyoutOperations } from './use_request_flyout_operations';

/**
 * "Operations" tab in the edge flyout.
 *
 * Shows the exit-span operations from the source service to the target
 * dependency: the span names, with call latency, throughput, failure rate
 * and impact (time consumed share) — all measured on the source side.
 */
export function RequestFlyoutOperations() {
  const { items, isLoading } = useRequestFlyoutOperations();

  const columns: Array<EuiBasicTableColumn<DependencyOperation>> = [
    {
      field: 'spanName',
      name: i18n.translate('xpack.apm.requestFlyout.operations.column.spanName', {
        defaultMessage: 'Operation',
      }),
      truncateText: true,
    },
    {
      field: 'latency',
      name: i18n.translate('xpack.apm.requestFlyout.operations.column.latency', {
        defaultMessage: 'Latency (avg)',
      }),
      align: 'right' as const,
      render: (value: number | null) =>
        value == null ? '—' : asMillisecondDuration(value),
    },
    {
      field: 'throughput',
      name: i18n.translate('xpack.apm.requestFlyout.operations.column.throughput', {
        defaultMessage: 'Throughput',
      }),
      align: 'right' as const,
      render: (value: number) => asTransactionRate(value),
    },
    {
      field: 'failureRate',
      name: i18n.translate('xpack.apm.requestFlyout.operations.column.failureRate', {
        defaultMessage: 'Failure rate',
      }),
      align: 'right' as const,
      render: (value: number | null) => (value == null ? '—' : asPercent(value, 1)),
    },
    {
      field: 'impact',
      name: i18n.translate('xpack.apm.requestFlyout.operations.column.impact', {
        defaultMessage: 'Impact',
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
