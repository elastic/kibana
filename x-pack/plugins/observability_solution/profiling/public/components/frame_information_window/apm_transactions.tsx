/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  Comparators,
  Criteria,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import React, { useMemo, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { NOT_AVAILABLE_LABEL } from '../../../common';
import { AsyncStatus } from '../../hooks/use_async';
import { useAnyOfProfilingParams } from '../../hooks/use_profiling_params';
import { useTimeRange } from '../../hooks/use_time_range';
import { useTimeRangeAsync } from '../../hooks/use_time_range_async';
import { asNumber } from '../../utils/formatters/as_number';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';

interface Props {
  serviceNames: Record<string, number>;
  functionName: string;
}

interface ServicesAndTransactions {
  serviceName: string;
  serviceSamples: number;
  transactionName: string | null;
  transactionSamples: number | null;
}

const findServicesAndTransactions = (
  servicesAndTransactions: ServicesAndTransactions[],
  pageIndex: number,
  pageSize: number,
  sortField: keyof ServicesAndTransactions,
  sortDirection: 'asc' | 'desc',
  filter: string
) => {
  let filteredItems: ServicesAndTransactions[] = servicesAndTransactions;
  if (!isEmpty(filter)) {
    filteredItems = servicesAndTransactions.filter((item) => item.serviceName.includes(filter));
  }

  let sortedItems: ServicesAndTransactions[];
  if (sortField) {
    sortedItems = filteredItems
      .slice(0)
      .sort(Comparators.property(sortField, Comparators.default(sortDirection)));
  } else {
    sortedItems = filteredItems;
  }

  let pageOfItems;

  if (!pageIndex && !pageSize) {
    pageOfItems = sortedItems;
  } else {
    const startIndex = pageIndex * pageSize;
    pageOfItems = sortedItems.slice(
      startIndex,
      Math.min(startIndex + pageSize, filteredItems.length)
    );
  }

  return {
    pageOfItems,
    totalItemCount: filteredItems.length,
  };
};

function EstimatedLabel({ label }: { label: string }) {
  return (
    <EuiToolTip
      content={i18n.translate('xpack.profiling.functionsView.samplesColumnLabel.hint', {
        defaultMessage: 'Estimated values',
      })}
    >
      <>
        {label} <EuiIcon size="s" color="subdued" type="questionInCircle" />
      </>
    </EuiToolTip>
  );
}

const SAMPLES_COLUMN_WIDTH = '152px';

export function APMTransactions({ functionName, serviceNames }: Props) {
  const {
    query: { rangeFrom, rangeTo },
  } = useAnyOfProfilingParams('/functions/*', '/flamegraphs/*');
  const timeRange = useTimeRange({ rangeFrom, rangeTo });

  const {
    services: { fetchTopNFunctionAPMTransactions },
    setup: { observabilityShared },
  } = useProfilingDependencies();

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [sortField, setSortField] = useState<keyof ServicesAndTransactions>('serviceSamples');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filter, setFilter] = useState('');
  const [filterDebounced, setFilterDebounced] = useState('');

  useDebounce(
    () => {
      setFilterDebounced(filter);
    },
    500,
    [filter]
  );

  const onTableChange = ({ page, sort }: Criteria<ServicesAndTransactions>) => {
    if (page) {
      const { index, size } = page;
      setPageIndex(index);
      setPageSize(size);
    }
    if (sort) {
      const { field, direction } = sort;
      setSortField(field);
      setSortDirection(direction);
    }
  };

  const initialServices: ServicesAndTransactions[] = useMemo(() => {
    return Object.keys(serviceNames).map((key) => {
      const samples = serviceNames[key];
      return {
        serviceName: key,
        serviceSamples: samples,
        transactionName: null,
        transactionSamples: null,
      };
    });
  }, [serviceNames]);

  const { pageOfItems, totalItemCount } = useMemo(
    () =>
      findServicesAndTransactions(
        initialServices,
        pageIndex,
        pageSize,
        sortField,
        sortDirection,
        filterDebounced
      ),
    [initialServices, pageIndex, pageSize, sortField, sortDirection, filterDebounced]
  );

  const { status, data: transactionsPerServiceMap = pageOfItems } = useTimeRangeAsync(
    ({ http }) => {
      const serviceNamesToSearch = pageOfItems.map((item) => item.serviceName).sort();
      if (serviceNamesToSearch.length) {
        return fetchTopNFunctionAPMTransactions({
          http,
          timeFrom: new Date(timeRange.start).getTime(),
          timeTo: new Date(timeRange.end).getTime(),
          functionName,
          serviceNames: serviceNamesToSearch,
        }).then((resp) => {
          return pageOfItems.flatMap((item) => {
            const transactionDetails = resp[item.serviceName];
            if (transactionDetails?.transactions?.length) {
              return transactionDetails.transactions.map((transaction) => ({
                ...item,
                transactionName: transaction.name,
                transactionSamples: transaction.samples,
              }));
            }
            return [item];
          });
        });
      }
      return Promise.resolve(pageOfItems);
    },
    [fetchTopNFunctionAPMTransactions, functionName, pageOfItems, timeRange.end, timeRange.start]
  );

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
                rangeFrom,
                rangeTo,
              })}
            >
              {serviceName}
            </EuiLink>
          );
        },
      },
      {
        field: 'serviceSamples',
        width: SAMPLES_COLUMN_WIDTH,
        sortable: true,
        name: (
          <EstimatedLabel
            label={i18n.translate('xpack.profiling.apmTransactions.columns.serviceSamplesName', {
              defaultMessage: 'Service Samples',
            })}
          />
        ),
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
                  rangeFrom,
                  rangeTo,
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
        name: (
          <EstimatedLabel
            label={i18n.translate('xpack.profiling.apmTransactions.columns.transactionSamples', {
              defaultMessage: 'Transaction Samples',
            })}
          />
        ),
        width: SAMPLES_COLUMN_WIDTH,
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
      rangeFrom,
      rangeTo,
    ]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiFieldSearch
          data-test-subj="profilingAPMTransactionsFieldText"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          isClearable
          fullWidth
          placeholder={i18n.translate('xpack.profiling.apmTransactions.searchPlaceholder', {
            defaultMessage: 'Search services by name',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiBasicTable
          loading={isLoadingTransactions}
          tableCaption={i18n.translate('xpack.profiling.apmTransactions.tableCaption', {
            defaultMessage: 'APM Services and Transactions links',
          })}
          items={transactionsPerServiceMap}
          columns={columns}
          pagination={{
            pageIndex,
            pageSize,
            totalItemCount,
            showPerPageOptions: false,
          }}
          sorting={{
            sort: {
              field: sortField,
              direction: sortDirection,
            },
          }}
          onChange={onTableChange}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
