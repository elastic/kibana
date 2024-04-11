/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiInMemoryTableProps,
  EuiLoadingSpinner,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { AsyncStatus } from '../../hooks/use_async';
import { useTimeRangeAsync } from '../../hooks/use_time_range_async';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';

interface Props {
  serviceNames: Record<string, number>;
  timeFrom: string;
  timeTo: string;
  functionName: string;
}

export function APMTransactions({ functionName, serviceNames, timeTo, timeFrom }: Props) {
  const {
    services: { fetchTopNFunctionAPMTransactions },
  } = useProfilingDependencies();

  const { status, data = [] } = useTimeRangeAsync(
    ({ http }) => {
      return fetchTopNFunctionAPMTransactions({
        http,
        timeFrom: 1712444400000,
        timeTo: 1713049199999,
        functionName,
        serviceNames: Object.keys(serviceNames),
      });
    },
    [fetchTopNFunctionAPMTransactions, functionName, serviceNames]
  );

  const columns: EuiInMemoryTableProps['columns'] = [
    {
      field: 'serviceName',
      name: i18n.translate('xpack.profiling.apmTransactions.columns.serviceName', {
        defaultMessage: 'Service Name',
      }),
      truncateText: true,
    },
    {
      field: 'transactionName',
      name: i18n.translate('xpack.profiling.apmTransactions.columns.transactionName', {
        defaultMessage: 'Transaction Name',
      }),
      truncateText: true,
    },
  ];

  if (status !== AsyncStatus.Settled) {
    return (
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiInMemoryTable
      tableCaption={i18n.translate('xpack.profiling.apmTransactions.tableCaption', {
        defaultMessage: 'APM Services and Transactions links',
      })}
      items={data}
      columns={columns}
      pagination={{ itemsPerPage: 5, showPerPageOptions: false }}
    />
  );
}
