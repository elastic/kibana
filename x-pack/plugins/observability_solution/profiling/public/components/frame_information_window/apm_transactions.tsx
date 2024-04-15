/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBasicTableColumn,
  EuiInMemoryTable,
  EuiInMemoryTableProps,
  EuiLink,
  EuiSearchBarProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { NOT_AVAILABLE_LABEL } from '../../../common';
import { AsyncStatus } from '../../hooks/use_async';
import { useAnyOfProfilingParams } from '../../hooks/use_profiling_params';
import { useTimeRange } from '../../hooks/use_time_range';
import { useTimeRangeAsync } from '../../hooks/use_time_range_async';
import type { APMTransactionsPerService } from '../../services';
import { asNumber } from '../../utils/formatters/as_number';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';

interface Props {
  serviceNames: Record<string, number>;
  functionName: string;
}

const search: EuiSearchBarProps = {
  box: {
    incremental: true,
    schema: true,
    placeholder: i18n.translate('xpack.profiling.apmTransactions.searchPlaceholder', {
      defaultMessage: 'Search services or transactions by name',
    }),
  },
};

const sorting: EuiInMemoryTableProps<APMTransactionsPerService[]>['sorting'] = {
  sort: {
    field: 'transactionSamples',
    direction: 'desc',
  },
};

export function APMTransactions({ functionName, serviceNames }: Props) {
  const {
    query: { rangeFrom, rangeTo },
  } = useAnyOfProfilingParams('/functions/*', '/flamegraphs/*');
  const timeRange = useTimeRange({ rangeFrom, rangeTo });

  const {
    services: { fetchTopNFunctionAPMTransactions },
    setup: { observabilityShared },
  } = useProfilingDependencies();

  const { status, data = [] } = useTimeRangeAsync(
    ({ http }) => {
      return fetchTopNFunctionAPMTransactions({
        http,
        timeFrom: new Date(timeRange.start).getTime(),
        timeTo: new Date(timeRange.end).getTime(),
        functionName,
        serviceNames: Object.keys(serviceNames),
      });
    },
    [fetchTopNFunctionAPMTransactions, functionName, serviceNames, timeRange.end, timeRange.start]
  );

  const columns: Array<EuiBasicTableColumn<APMTransactionsPerService>> = useMemo(
    () => [
      {
        field: 'serviceName',
        name: i18n.translate('xpack.profiling.apmTransactions.columns.serviceName', {
          defaultMessage: 'Service Name',
        }),
        truncateText: true,
        sortable: true,
        render: (_, { serviceName }) => {
          return (
            <EuiLink
              data-test-subj="profilingColumnsLink"
              href={observabilityShared.locators.apm.serviceOverview.getRedirectUrl({
                serviceName,
              })}
            >
              {serviceName}
            </EuiLink>
          );
        },
      },
      {
        field: 'transactionName',
        name: i18n.translate('xpack.profiling.apmTransactions.columns.transactionName', {
          defaultMessage: 'Transaction Name',
        }),
        truncateText: true,
        sortable: true,
        render(_, { serviceName, transactionName }) {
          if (transactionName) {
            return (
              <EuiLink
                data-test-subj="profilingColumnsLink"
                href={observabilityShared.locators.apm.transactionDetailsByName.getRedirectUrl({
                  serviceName,
                  transactionName,
                })}
              >
                {transactionName}
              </EuiLink>
            );
          }
          return NOT_AVAILABLE_LABEL;
        },
      },
      {
        field: 'transactionSamples',
        name: i18n.translate('xpack.profiling.apmTransactions.columns.transactionName', {
          defaultMessage: 'Transaction Samples',
        }),
        sortable: true,
        render(_, { transactionSamples }) {
          if (transactionSamples === null) {
            return NOT_AVAILABLE_LABEL;
          }
          return asNumber(transactionSamples);
        },
      },
    ],
    [
      observabilityShared.locators.apm.serviceOverview,
      observabilityShared.locators.apm.transactionDetailsByName,
    ]
  );

  return (
    <EuiInMemoryTable
      loading={status !== AsyncStatus.Settled}
      tableCaption={i18n.translate('xpack.profiling.apmTransactions.tableCaption', {
        defaultMessage: 'APM Services and Transactions links',
      })}
      items={data}
      columns={columns}
      pagination={{ pageSize: 5, showPerPageOptions: false }}
      searchFormat="text"
      search={search}
      sorting={sorting}
    />
  );
}
