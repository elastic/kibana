/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { compact, merge } from 'lodash';
import { useStateDebounced } from '../../../hooks/use_debounce';
import { ApmDocumentType } from '../../../../common/document_type';
import {
  getLatencyAggregationType,
  LatencyAggregationType,
} from '../../../../common/latency_aggregation_types';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useBreakpoints } from '../../../hooks/use_breakpoints';
import {
  FETCH_STATUS,
  isPending,
  useFetcher,
} from '../../../hooks/use_fetcher';
import { usePreferredDataSourceAndBucketSize } from '../../../hooks/use_preferred_data_source_and_bucket_size';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { TransactionOverviewLink } from '../links/apm/transaction_overview_link';
import { fromQuery, toQuery } from '../links/url_helpers';
import { OverviewTableContainer } from '../overview_table_container';
import { isTimeComparison } from '../time_comparison/get_comparison_options';
import { getColumns } from './get_columns';
import { TableSearchBar } from '../table_search_bar/table_search_bar';

type ApiResponse =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics'>;

const INITIAL_STATE: ApiResponse = {
  transactionGroups: [],
  maxCountExceeded: false,
  transactionOverflowCount: 0,
  hasActiveAlerts: false,
};

type SortDirection = 'asc' | 'desc';
type SortField = 'name' | 'latency' | 'throughput' | 'errorRate' | 'impact';

interface Props {
  hideTitle?: boolean;
  hideViewTransactionsLink?: boolean;
  isSingleColumn?: boolean;
  numberOfTransactionsPerPage?: number;
  showPerPageOptions?: boolean;
  showMaxTransactionGroupsExceededWarning?: boolean;
  environment: string;
  fixedHeight?: boolean;
  kuery: string;
  start: string;
  end: string;
  saveTableOptionsToUrl?: boolean;
}

export function TransactionsTable({
  fixedHeight = false,
  hideViewTransactionsLink = false,
  hideTitle = false,
  isSingleColumn = true,
  numberOfTransactionsPerPage = 5,
  showPerPageOptions = true,
  showMaxTransactionGroupsExceededWarning = false,
  environment,
  kuery,
  start,
  end,
  saveTableOptionsToUrl = false,
}: Props) {
  const { link } = useApmRouter();

  const {
    query,
    query: {
      comparisonEnabled,
      offset,
      latencyAggregationType: latencyAggregationTypeFromQuery,
    },
  } = useAnyOfApmParams(
    '/services/{serviceName}/transactions',
    '/services/{serviceName}/overview',
    '/mobile-services/{serviceName}/transactions',
    '/mobile-services/{serviceName}/overview'
  );

  const latencyAggregationType = getLatencyAggregationType(
    latencyAggregationTypeFromQuery
  );

  // SparkPlots should be hidden if we're in two-column view and size XL (1200px)
  const { isXl } = useBreakpoints();
  const shouldShowSparkPlots = isSingleColumn || !isXl;
  const { transactionType, serviceName } = useApmServiceContext();
  const [searchQuery, setSearchQueryDebounced] = useStateDebounced('', 300);
  const [tableOptions, setTableOptions] = useTableOptions<SortField>({
    initialPageSize: numberOfTransactionsPerPage,
  });

  const [currentPage, setCurrentPage] = useState<{
    items: ApiResponse['transactionGroups'];
    totalCount: number;
  }>({ items: [], totalCount: 0 });

  const {
    mainStatistics,
    mainStatisticsStatus,
    detailedStatistics,
    detailedStatisticsStatus,
  } = useTableData({
    comparisonEnabled,
    currentPageItems: currentPage.items,
    end,
    environment,
    kuery,
    latencyAggregationType,
    offset,
    searchQuery,
    serviceName,
    start,
    transactionType,
  });

  const columns = useMemo(() => {
    return getColumns({
      serviceName,
      latencyAggregationType: latencyAggregationType as LatencyAggregationType,
      detailedStatisticsLoading: isPending(detailedStatisticsStatus),
      detailedStatistics,
      comparisonEnabled,
      shouldShowSparkPlots,
      offset,
      transactionOverflowCount: mainStatistics.transactionOverflowCount,
      showAlertsColumn: mainStatistics.hasActiveAlerts,
      link,
      query,
    });
  }, [
    comparisonEnabled,
    detailedStatistics,
    detailedStatisticsStatus,
    latencyAggregationType,
    link,
    mainStatistics.hasActiveAlerts,
    mainStatistics.transactionOverflowCount,
    offset,
    query,
    serviceName,
    shouldShowSparkPlots,
  ]);

  const pagination = useMemo(() => {
    return {
      pageIndex: tableOptions.page.index,
      pageSize: tableOptions.page.size,
      totalItemCount: currentPage.totalCount,
      showPerPageOptions,
    };
  }, [
    tableOptions.page.index,
    tableOptions.page.size,
    currentPage.totalCount,
    showPerPageOptions,
  ]);

  const sorting = useMemo(
    () => ({ sort: tableOptions.sort }),
    [tableOptions.sort]
  );

  const history = useHistory();
  const onChangeHandler = useCallback(
    (changedTableOptions: Partial<TableOptions<string>>) => {
      setTableOptions((prevTableOptions) =>
        merge({}, prevTableOptions, changedTableOptions)
      );

      if (saveTableOptionsToUrl) {
        history.push({
          ...history.location,
          search: fromQuery({
            ...toQuery(history.location.search),
            page: changedTableOptions.page?.index,
            pageSize: changedTableOptions.page?.size,
            sortField: changedTableOptions.sort?.field,
            sortDirection: changedTableOptions.sort?.direction,
          }),
        });
      }
    },
    [setTableOptions, saveTableOptionsToUrl, history]
  );

  const onChangeSearchQuery = useCallback(
    ({
      searchQuery: q,
      shouldFetchServer,
    }: {
      searchQuery: string;
      shouldFetchServer: boolean;
    }) => {
      if (shouldFetchServer) {
        setSearchQueryDebounced(q);
      }
    },
    [setSearchQueryDebounced]
  );

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      data-test-subj="transactionsGroupTable"
    >
      {!hideTitle && (
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h2>
                  {i18n.translate('xpack.apm.transactionsTable.title', {
                    defaultMessage: 'Transactions',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            {!hideViewTransactionsLink && (
              <EuiFlexItem grow={false}>
                <TransactionOverviewLink
                  serviceName={serviceName}
                  latencyAggregationType={latencyAggregationType}
                  transactionType={transactionType}
                >
                  {i18n.translate('xpack.apm.transactionsTable.linkText', {
                    defaultMessage: 'View transactions',
                  })}
                </TransactionOverviewLink>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      )}

      {showMaxTransactionGroupsExceededWarning &&
        mainStatistics.maxCountExceeded && (
          <EuiFlexItem>
            <EuiCallOut
              title={i18n.translate(
                'xpack.apm.transactionsCallout.cardinalityWarning.title',
                {
                  defaultMessage:
                    'Number of transaction groups exceed the allowed maximum(1,000) that are displayed.',
                }
              )}
              color="warning"
              iconType="warning"
            >
              <p>
                <FormattedMessage
                  id="xpack.apm.transactionsCallout.transactionGroupLimit.exceeded"
                  defaultMessage="The maximum number of transaction groups displayed in Kibana has been reached. Try narrowing down results by using the query bar."
                />
              </p>
            </EuiCallOut>
          </EuiFlexItem>
        )}
      <EuiFlexItem>
        <TableSearchBar
          isEnabled={true}
          items={mainStatistics.transactionGroups}
          fieldsToSearch={['name']}
          maxCountExceeded={mainStatistics.maxCountExceeded}
          tableOptions={tableOptions}
          onChangeCurrentPage={setCurrentPage}
          onChangeSearchQuery={onChangeSearchQuery}
          placeholder={i18n.translate(
            'xpack.apm.transactionsTable.tableSearch.placeholder',
            {
              defaultMessage: 'Search transactions by name',
            }
          )}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <OverviewTableContainer
          fixedHeight={fixedHeight}
          isEmptyAndNotInitiated={
            mainStatistics.transactionGroups.length === 0 &&
            mainStatisticsStatus === FETCH_STATUS.NOT_INITIATED
          }
        >
          <EuiBasicTable
            loading={mainStatisticsStatus === FETCH_STATUS.LOADING}
            noItemsMessage={
              mainStatisticsStatus === FETCH_STATUS.LOADING
                ? i18n.translate('xpack.apm.transactionsTable.loading', {
                    defaultMessage: 'Loading...',
                  })
                : i18n.translate('xpack.apm.transactionsTable.noResults', {
                    defaultMessage: 'No transactions found',
                  })
            }
            error={
              mainStatisticsStatus === FETCH_STATUS.FAILURE
                ? i18n.translate('xpack.apm.transactionsTable.errorMessage', {
                    defaultMessage: 'Failed to fetch',
                  })
                : ''
            }
            items={currentPage.items}
            columns={columns}
            pagination={pagination}
            sorting={sorting}
            onChange={onChangeHandler}
          />
        </OverviewTableContainer>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function useTableData({
  comparisonEnabled,
  currentPageItems,
  end,
  environment,
  kuery,
  latencyAggregationType,
  offset,
  searchQuery,
  serviceName,
  start,
  transactionType,
}: {
  comparisonEnabled: boolean | undefined;
  currentPageItems: ApiResponse['transactionGroups'];
  end: string;
  environment: string;
  kuery: string;
  latencyAggregationType: LatencyAggregationType | undefined;
  offset: string | undefined;
  searchQuery: string;
  serviceName: string;
  start: string;
  transactionType: string | undefined;
}) {
  const preferredDataSource = usePreferredDataSourceAndBucketSize({
    start,
    end,
    kuery,
    numBuckets: 20,
    type: ApmDocumentType.TransactionMetric,
  });

  const shouldUseDurationSummary =
    latencyAggregationType === 'avg' &&
    preferredDataSource?.source?.hasDurationSummaryField;

  const { data: mainStatistics = INITIAL_STATE, status: mainStatisticsStatus } =
    useFetcher(
      (callApmApi) => {
        if (
          !latencyAggregationType ||
          !transactionType ||
          !preferredDataSource
        ) {
          return Promise.resolve(undefined);
        }
        return callApmApi(
          'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics',
          {
            params: {
              path: { serviceName },
              query: {
                environment,
                kuery,
                start,
                end,
                transactionType,
                useDurationSummary: !!shouldUseDurationSummary,
                latencyAggregationType:
                  latencyAggregationType as LatencyAggregationType,
                documentType: preferredDataSource.source.documentType,
                rollupInterval: preferredDataSource.source.rollupInterval,
                searchQuery,
              },
            },
          }
        );
      },
      [
        searchQuery,
        end,
        environment,
        kuery,
        latencyAggregationType,
        preferredDataSource,
        serviceName,
        shouldUseDurationSummary,
        start,
        transactionType,
      ]
    );

  const { data: detailedStatistics, status: detailedStatisticsStatus } =
    useFetcher(
      (callApmApi) => {
        const transactionNames = compact(
          currentPageItems.map(({ name }) => name)
        );
        if (
          start &&
          end &&
          transactionType &&
          latencyAggregationType &&
          preferredDataSource &&
          transactionNames.length > 0
        ) {
          return callApmApi(
            'GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics',
            {
              params: {
                path: { serviceName },
                query: {
                  environment,
                  kuery,
                  start,
                  end,
                  bucketSizeInSeconds: preferredDataSource.bucketSizeInSeconds,
                  transactionType,
                  documentType: preferredDataSource.source.documentType,
                  rollupInterval: preferredDataSource.source.rollupInterval,
                  useDurationSummary: !!shouldUseDurationSummary,
                  latencyAggregationType:
                    latencyAggregationType as LatencyAggregationType,
                  transactionNames: JSON.stringify(transactionNames.sort()),
                  offset:
                    comparisonEnabled && isTimeComparison(offset)
                      ? offset
                      : undefined,
                },
              },
            }
          );
        }
      },
      // only fetches detailed statistics when `currentPageItems` is updated.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [currentPageItems, offset, comparisonEnabled],
      { preservePreviousData: false }
    );

  return {
    mainStatistics,
    mainStatisticsStatus,
    detailedStatistics,
    detailedStatisticsStatus,
  };
}

interface TableOptions<F extends string> {
  page: { index: number; size: number };
  sort: { direction: SortDirection; field: F };
}

function useTableOptions<T extends string>({
  initialPageSize,
}: {
  initialPageSize: number;
}) {
  const {
    query: {
      page: urlPage = 0,
      pageSize: urlPageSize = initialPageSize,
      sortField: urlSortField = 'impact',
      sortDirection: urlSortDirection = 'desc',
    },
  } = useAnyOfApmParams(
    '/services/{serviceName}/transactions',
    '/services/{serviceName}/overview',
    '/mobile-services/{serviceName}/transactions',
    '/mobile-services/{serviceName}/overview'
  );

  const [tableOptions, setTableOptions] = useState<{
    page: { index: number; size: number };
    sort: { direction: SortDirection; field: T };
  }>({
    page: { index: urlPage, size: urlPageSize },
    sort: {
      field: urlSortField as T,
      direction: urlSortDirection as SortDirection,
    },
  });

  useEffect(() => {
    setTableOptions({
      page: { index: urlPage, size: urlPageSize },
      sort: {
        field: urlSortField as T,
        direction: urlSortDirection as SortDirection,
      },
    });
  }, [urlPage, urlPageSize, urlSortDirection, urlSortField]);

  return [tableOptions, setTableOptions] as const;
}
