/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { orderBy } from 'lodash';
import React, { useState } from 'react';
import uuid from 'uuid';
import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCode } from '@elastic/eui';
import { APIReturnType } from '../../../services/rest/createCallApmApi';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { TransactionOverviewLink } from '../Links/apm/transaction_overview_link';
import { getTimeRangeComparison } from '../time_comparison/get_time_range_comparison';
import { OverviewTableContainer } from '../overview_table_container';
import { getColumns } from './get_columns';
import { ElasticDocsLink } from '../Links/ElasticDocsLink';
import { useBreakpoints } from '../../../hooks/use_breakpoints';

type ApiResponse =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics'>;

interface InitialState {
  requestId: string;
  mainStatisticsData: ApiResponse & {
    transactionGroupsTotalItems: number;
  };
}

const INITIAL_STATE: InitialState = {
  requestId: '',
  mainStatisticsData: {
    transactionGroups: [],
    isAggregationAccurate: true,
    bucketSize: 0,
    transactionGroupsTotalItems: 0,
  },
};

type SortField = 'name' | 'latency' | 'throughput' | 'errorRate' | 'impact';
type SortDirection = 'asc' | 'desc';
const DEFAULT_SORT = {
  direction: 'desc' as const,
  field: 'impact' as const,
};

interface Props {
  hideViewTransactionsLink?: boolean;
  isSingleColumn?: boolean;
  numberOfTransactionsPerPage?: number;
  showAggregationAccurateCallout?: boolean;
  environment: string;
  fixedHeight?: boolean;
  kuery: string;
  start: string;
  end: string;
}

export function TransactionsTable({
  fixedHeight = false,
  hideViewTransactionsLink = false,
  isSingleColumn = true,
  numberOfTransactionsPerPage = 5,
  showAggregationAccurateCallout = false,
  environment,
  kuery,
  start,
  end,
}: Props) {
  const [tableOptions, setTableOptions] = useState<{
    pageIndex: number;
    sort: {
      direction: SortDirection;
      field: SortField;
    };
  }>({
    pageIndex: 0,
    sort: DEFAULT_SORT,
  });

  // SparkPlots should be hidden if we're in two-column view and size XL (1200px)
  const { isXl } = useBreakpoints();
  const shouldShowSparkPlots = isSingleColumn || !isXl;

  const { pageIndex, sort } = tableOptions;
  const { direction, field } = sort;

  const { transactionType, serviceName } = useApmServiceContext();
  const {
    urlParams: { latencyAggregationType, comparisonType, comparisonEnabled },
  } = useLegacyUrlParams();

  const { comparisonStart, comparisonEnd } = getTimeRangeComparison({
    start,
    end,
    comparisonType,
    comparisonEnabled,
  });

  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      if (!start || !end || !latencyAggregationType || !transactionType) {
        return;
      }
      return callApmApi({
        endpoint:
          'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics',
        params: {
          path: { serviceName },
          query: {
            environment,
            kuery,
            start,
            end,
            transactionType,
            latencyAggregationType,
          },
        },
      }).then((response) => {
        const currentPageTransactionGroups = orderBy(
          response.transactionGroups,
          field,
          direction
        ).slice(
          pageIndex * numberOfTransactionsPerPage,
          (pageIndex + 1) * numberOfTransactionsPerPage
        );

        return {
          // Everytime the main statistics is refetched, updates the requestId making the detailed API to be refetched.
          requestId: uuid(),
          mainStatisticsData: {
            ...response,
            transactionGroups: currentPageTransactionGroups,
            transactionGroupsTotalItems: response.transactionGroups.length,
          },
        };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      environment,
      kuery,
      serviceName,
      start,
      end,
      transactionType,
      latencyAggregationType,
      pageIndex,
      direction,
      field,
      // not used, but needed to trigger an update when comparisonType is changed either manually by user or when time range is changed
      comparisonType,
      // not used, but needed to trigger an update when comparison feature is disabled/enabled by user
      comparisonEnabled,
    ]
  );

  const {
    requestId,
    mainStatisticsData: {
      transactionGroups,
      isAggregationAccurate,
      bucketSize,
      transactionGroupsTotalItems,
    },
  } = data;

  const { data: transactionGroupDetailedStatistics } = useFetcher(
    (callApmApi) => {
      if (
        transactionGroupsTotalItems &&
        start &&
        end &&
        transactionType &&
        latencyAggregationType
      ) {
        return callApmApi({
          endpoint:
            'GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics',
          params: {
            path: { serviceName },
            query: {
              environment,
              kuery,
              start,
              end,
              numBuckets: 20,
              transactionType,
              latencyAggregationType,
              transactionNames: JSON.stringify(
                transactionGroups.map(({ name }) => name).sort()
              ),
              comparisonStart,
              comparisonEnd,
            },
          },
        });
      }
    },
    // only fetches detailed statistics when requestId is invalidated by main statistics api call
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requestId],
    { preservePreviousData: false }
  );

  const columns = getColumns({
    serviceName,
    latencyAggregationType,
    transactionGroupDetailedStatistics,
    comparisonEnabled,
    shouldShowSparkPlots,
    comparisonType,
  });

  const isLoading = status === FETCH_STATUS.LOADING;
  const isNotInitiated = status === FETCH_STATUS.NOT_INITIATED;

  const pagination = {
    pageIndex,
    pageSize: numberOfTransactionsPerPage,
    totalItemCount: transactionGroupsTotalItems,
    hidePerPageOptions: true,
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
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
      {showAggregationAccurateCallout && !isAggregationAccurate && (
        <EuiFlexItem>
          <EuiCallOut
            title={i18n.translate(
              'xpack.apm.transactionsTable.cardinalityWarning.title',
              {
                defaultMessage:
                  'This view shows a subset of reported transactions.',
              }
            )}
            color="danger"
            iconType="alert"
          >
            <p>
              <FormattedMessage
                id="xpack.apm.transactionsTable.cardinalityWarning.body"
                defaultMessage="The number of unique transaction names exceeds the configured value of {bucketSize}. Try reconfiguring your agents to group similar transactions or increase the value of {codeBlock}"
                values={{
                  bucketSize,
                  codeBlock: (
                    <EuiCode>xpack.apm.ui.transactionGroupBucketSize</EuiCode>
                  ),
                }}
              />

              <ElasticDocsLink
                section="/kibana"
                path="/troubleshooting.html#troubleshooting-too-many-transactions"
              >
                {i18n.translate(
                  'xpack.apm.transactionsTable.cardinalityWarning.docsLink',
                  { defaultMessage: 'Learn more in the docs' }
                )}
              </ElasticDocsLink>
            </p>
          </EuiCallOut>
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiFlexItem>
          <OverviewTableContainer
            fixedHeight={fixedHeight}
            isEmptyAndNotInitiated={
              transactionGroupsTotalItems === 0 && isNotInitiated
            }
          >
            <EuiBasicTable
              noItemsMessage={
                isLoading
                  ? i18n.translate('xpack.apm.transactionsTable.loading', {
                      defaultMessage: 'Loading...',
                    })
                  : i18n.translate('xpack.apm.transactionsTable.noResults', {
                      defaultMessage: 'No transaction groups found',
                    })
              }
              loading={isLoading}
              error={
                status === FETCH_STATUS.FAILURE
                  ? i18n.translate('xpack.apm.transactionsTable.errorMessage', {
                      defaultMessage: 'Failed to fetch',
                    })
                  : ''
              }
              items={transactionGroups}
              columns={columns}
              pagination={pagination}
              sorting={{ sort: { field, direction } }}
              onChange={(newTableOptions: {
                page?: {
                  index: number;
                };
                sort?: { field: string; direction: SortDirection };
              }) => {
                setTableOptions({
                  pageIndex: newTableOptions.page?.index ?? 0,
                  sort: newTableOptions.sort
                    ? {
                        field: newTableOptions.sort.field as SortField,
                        direction: newTableOptions.sort.direction,
                      }
                    : DEFAULT_SORT,
                });
              }}
            />
          </OverviewTableContainer>
        </EuiFlexItem>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
