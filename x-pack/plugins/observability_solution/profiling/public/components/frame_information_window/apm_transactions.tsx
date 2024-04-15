/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  CriteriaWithPagination,
  EuiBasicTableColumn,
  EuiInMemoryTable,
  EuiInMemoryTableProps,
  EuiLink,
  EuiSearchBarProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
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
    field: 'serviceSamples',
    direction: 'desc',
  },
};

const PAGE_SIZE = 5;

interface ServicesAndTransactions {
  serviceName: string;
  serviceSamples: number;
  transactionName: string | null;
  transactionSamples: number | null;
}

export function APMTransactions({ functionName, serviceNames }: Props) {
  const {
    query: { rangeFrom, rangeTo },
  } = useAnyOfProfilingParams('/functions/*', '/flamegraphs/*');
  const timeRange = useTimeRange({ rangeFrom, rangeTo });

  const {
    services: { fetchTopNFunctionAPMTransactions },
    setup: { observabilityShared },
  } = useProfilingDependencies();

  const [pagination, setPagination] = useState({ pageIndex: 0 });

  function onTableChange({ page: { index } }: CriteriaWithPagination<ServicesAndTransactions>) {
    setPagination({ pageIndex: index });
  }

  const { status, data: transactionsPerServiceMap = {} } = useTimeRangeAsync(
    ({ http }) => {
      const pageStart = pagination.pageIndex * PAGE_SIZE;

      return fetchTopNFunctionAPMTransactions({
        http,
        timeFrom: new Date(timeRange.start).getTime(),
        timeTo: new Date(timeRange.end).getTime(),
        functionName,
        serviceNames: Object.keys(serviceNames).slice(pageStart, pageStart + PAGE_SIZE),
      });
    },
    [
      fetchTopNFunctionAPMTransactions,
      functionName,
      pagination.pageIndex,
      serviceNames,
      timeRange.end,
      timeRange.start,
    ]
  );

  const servicesAndTransactions: ServicesAndTransactions[] = useMemo(() => {
    return Object.keys(serviceNames).flatMap((key) => {
      const serviceTransactions = transactionsPerServiceMap[key];
      return serviceTransactions?.transactions?.length
        ? serviceTransactions.transactions.map((transaction) => ({
            serviceName: key,
            serviceSamples: serviceNames[key],
            transactionName: transaction.name,
            transactionSamples: transaction.samples,
          }))
        : [
            {
              serviceName: key,
              serviceSamples: serviceNames[key],
              transactionName: null,
              transactionSamples: null,
            },
          ];
    });
  }, [serviceNames, transactionsPerServiceMap]);

  const isLoadingTransactions = status !== AsyncStatus.Settled;

  const columns: Array<EuiBasicTableColumn<ServicesAndTransactions>> = useMemo(
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
        field: 'serviceSamples',
        name: i18n.translate('xpack.profiling.apmTransactions.columns.serviceSamplesName', {
          defaultMessage: 'Service Samples',
        }),
        width: '150px',
        sortable: true,
        render(_, { serviceSamples }) {
          return asNumber(serviceSamples);
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
          if (isLoadingTransactions) {
            return '--';
          }

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
        width: '150px',
        render(_, { transactionSamples }) {
          if (isLoadingTransactions) {
            return '--';
          }

          if (transactionSamples === null) {
            return NOT_AVAILABLE_LABEL;
          }
          return asNumber(transactionSamples);
        },
      },
    ],
    [
      isLoadingTransactions,
      observabilityShared.locators.apm.serviceOverview,
      observabilityShared.locators.apm.transactionDetailsByName,
    ]
  );

  return (
    <EuiInMemoryTable
      loading={isLoadingTransactions}
      tableCaption={i18n.translate('xpack.profiling.apmTransactions.tableCaption', {
        defaultMessage: 'APM Services and Transactions links',
      })}
      items={servicesAndTransactions}
      columns={columns}
      pagination={{ ...pagination, pageSize: PAGE_SIZE, showPerPageOptions: false }}
      onTableChange={onTableChange}
      searchFormat="text"
      search={search}
      sorting={sorting}
    />
  );
}
