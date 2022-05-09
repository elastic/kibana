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
import React, { useMemo, useState } from 'react';
import uuid from 'uuid';
import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { TransactionOverviewLink } from '../links/apm/transaction_overview_link';
import { OverviewTableContainer } from '../overview_table_container';
import { getColumns } from './get_columns';
import { ElasticDocsLink } from '../links/elastic_docs_link';
import { useBreakpoints } from '../../../hooks/use_breakpoints';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { fromQuery, toQuery } from '../links/url_helpers';

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
  showPerPageOptions?: boolean;
  showAggregationAccurateCallout?: boolean;
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
  isSingleColumn = true,
  numberOfTransactionsPerPage = 5,
  showPerPageOptions = true,
  showAggregationAccurateCallout = false,
  environment,
  kuery,
  start,
  end,
  saveTableOptionsToUrl = false,
}: Props) {
  const history = useHistory();

  const {
    query: {
      comparisonEnabled,
      offset,
      latencyAggregationType,
      page: urlPage = 0,
      pageSize: urlPageSize = numberOfTransactionsPerPage,
      sortField: urlSortField = 'impact',
      sortDirection: urlSortDirection = 'desc',
    },
  } = useAnyOfApmParams(
    '/services/{serviceName}/transactions',
    '/services/{serviceName}/overview'
  );

  const [tableOptions, setTableOptions] = useState<{
    page: { index: number; size: number };
    sort: { direction: SortDirection; field: SortField };
  }>({
    page: { index: urlPage, size: urlPageSize },
    sort: {
      field: urlSortField as SortField,
      direction: urlSortDirection as SortDirection,
    },
  });

  // SparkPlots should be hidden if we're in two-column view and size XL (1200px)
  const { isXl } = useBreakpoints();
  const shouldShowSparkPlots = isSingleColumn || !isXl;

  const { page, sort } = tableOptions;
  const { direction, field } = sort;
  const { index, size } = page;

  const { transactionType, serviceName } = useApmServiceContext();

  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      if (!start || !end || !latencyAggregationType || !transactionType) {
        return;
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
              latencyAggregationType:
                latencyAggregationType as LatencyAggregationType,
            },
          },
        }
      ).then((response) => {
        const currentPageTransactionGroups = orderBy(
          response.transactionGroups,
          field,
          direction
        ).slice(index * size, (index + 1) * size);

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
      index,
      size,
      direction,
      field,
      // not used, but needed to trigger an update when offset is changed either manually by user or when time range is changed
      offset,
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

  const {
    data: transactionGroupDetailedStatistics,
    status: transactionGroupDetailedStatisticsStatus,
  } = useFetcher(
    (callApmApi) => {
      if (
        transactionGroupsTotalItems &&
        start &&
        end &&
        transactionType &&
        latencyAggregationType
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
                numBuckets: 20,
                transactionType,
                latencyAggregationType:
                  latencyAggregationType as LatencyAggregationType,
                transactionNames: JSON.stringify(
                  transactionGroups.map(({ name }) => name).sort()
                ),
                offset: comparisonEnabled ? offset : undefined,
              },
            },
          }
        );
      }
    },
    // only fetches detailed statistics when requestId is invalidated by main statistics api call
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requestId],
    { preservePreviousData: false }
  );

  const columns = getColumns({
    serviceName,
    latencyAggregationType: latencyAggregationType as LatencyAggregationType,
    transactionGroupDetailedStatisticsLoading:
      transactionGroupDetailedStatisticsStatus === FETCH_STATUS.LOADING ||
      transactionGroupDetailedStatisticsStatus === FETCH_STATUS.NOT_INITIATED,
    transactionGroupDetailedStatistics,
    comparisonEnabled,
    shouldShowSparkPlots,
    offset,
  });

  const isLoading = status === FETCH_STATUS.LOADING;
  const isNotInitiated = status === FETCH_STATUS.NOT_INITIATED;

  const pagination = useMemo(
    () => ({
      pageIndex: index,
      pageSize: size,
      totalItemCount: transactionGroupsTotalItems,
      showPerPageOptions,
    }),
    [index, size, transactionGroupsTotalItems, showPerPageOptions]
  );

  const sorting = useMemo(
    () => ({ sort: { field, direction } }),
    [field, direction]
  );

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      data-test-subj="transactionsGroupTable"
    >
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
              sorting={sorting}
              onChange={(newTableOptions: {
                page?: { index: number; size: number };
                sort?: { field: string; direction: SortDirection };
              }) => {
                setTableOptions({
                  page: {
                    index: newTableOptions.page?.index ?? 0,
                    size:
                      newTableOptions.page?.size ?? numberOfTransactionsPerPage,
                  },
                  sort: newTableOptions.sort
                    ? {
                        field: newTableOptions.sort.field as SortField,
                        direction: newTableOptions.sort.direction,
                      }
                    : DEFAULT_SORT,
                });
                if (saveTableOptionsToUrl) {
                  history.push({
                    ...history.location,
                    search: fromQuery({
                      ...toQuery(history.location.search),
                      page: newTableOptions.page?.index,
                      pageSize: newTableOptions.page?.size,
                      sortField: newTableOptions.sort?.field,
                      sortDirection: newTableOptions.sort?.direction,
                    }),
                  });
                }
              }}
            />
          </OverviewTableContainer>
        </EuiFlexItem>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
