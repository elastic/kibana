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
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { orderBy } from 'lodash';
import React, { useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { useBreakpoints } from '../../../hooks/use_breakpoints';
import {
  FETCH_STATUS,
  isPending,
  useFetcher,
} from '../../../hooks/use_fetcher';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { txGroupsDroppedBucketName } from '../links/apm/transaction_detail_link';
import { OverviewTableContainer } from '../overview_table_container';
import { isTimeComparison } from '../time_comparison/get_comparison_options';
import { getColumns } from './get_columns';

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
    maxTransactionGroupsExceeded: false,
    transactionOverflowCount: 0,
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
  showMaxTransactionGroupsExceededWarning?: boolean;
  environment: string;
  fixedHeight?: boolean;
  kuery: string;
  start: string;
  end: string;
  saveTableOptionsToUrl?: boolean;
  comparisonEnabled: boolean;
  transactionType: string;
  offset: string;
  serviceName: string;
  url?: string;
}

export function TransactionsTableEmbeddable({
  fixedHeight = false,
  hideViewTransactionsLink = false,
  isSingleColumn = true,
  numberOfTransactionsPerPage = 5,
  showPerPageOptions = true,
  showMaxTransactionGroupsExceededWarning = false,
  environment,
  kuery,
  start,
  end,
  comparisonEnabled,
  transactionType,
  offset,
  serviceName,
  url,
}: Props) {
  const { core } = useApmPluginContext();
  const basePath = core.http.basePath.get();

  const latencyAggregationType = LatencyAggregationType.avg;

  const urlPage = 0;
  const pageSize = numberOfTransactionsPerPage;
  const sortField = 'impact';
  const sortDirection = 'desc';

  const [tableOptions, setTableOptions] = useState<{
    page: { index: number; size: number };
    sort: { direction: SortDirection; field: SortField };
  }>({
    page: { index: urlPage, size: pageSize },
    sort: {
      field: sortField as SortField,
      direction: sortDirection as SortDirection,
    },
  });

  // SparkPlots should be hidden if we're in two-column view and size XL (1200px)
  const { isXl } = useBreakpoints();
  const shouldShowSparkPlots = isSingleColumn || !isXl;

  const { page, sort } = tableOptions;
  const { direction, field } = sort;
  const { index, size } = page;

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
          [
            (transactionItem) =>
              transactionItem.name === txGroupsDroppedBucketName ? -1 : 0,
            field,
          ],
          ['asc', direction]
        ).slice(index * size, (index + 1) * size);

        return {
          // Everytime the main statistics is refetched, updates the requestId making the detailed API to be refetched.
          requestId: uuidv4(),
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
      maxTransactionGroupsExceeded,
      transactionOverflowCount,
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
    // only fetches detailed statistics when requestId is invalidated by main statistics api call
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requestId],
    { preservePreviousData: false }
  );

  const columns = getColumns({
    serviceName,
    latencyAggregationType: latencyAggregationType as LatencyAggregationType,
    transactionGroupDetailedStatisticsLoading: isPending(
      transactionGroupDetailedStatisticsStatus
    ),
    transactionGroupDetailedStatistics,
    comparisonEnabled,
    shouldShowSparkPlots,
    offset,
    transactionOverflowCount,
  });
  // Only take columns with name: 'name', 'latency', 'impact' if url is present
  const selectiveColumns = url
    ? columns.filter((c) =>
        ['name', 'latency', 'impact'].includes(
          (c as unknown as { field: string }).field
        )
      )
    : columns;

  const isLoading = status === FETCH_STATUS.LOADING;
  const isNotInitiated = status === FETCH_STATUS.NOT_INITIATED;
  const hasFailed = status === FETCH_STATUS.FAILURE;

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

  const transactionsLink = serviceName
    ? `${basePath}/app/apm/services/${serviceName}/transactions?comparisonEnabled=true&environment=ENVIRONMENT_ALL&offset=1d&rangeFrom=${start}&rangeTo=${end}&kuery=${kuery}&transactionType=${transactionType}&latencyAggregationType=${latencyAggregationType}`
    : undefined;

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
                {i18n.translate('xpack.apm.embeddedTransactionsTable.title', {
                  defaultMessage: 'APM Transactions ({serviceName})',
                  values: {
                    serviceName,
                  },
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          {!hideViewTransactionsLink && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                css={{ justifySelf: 'flex-end' }}
                size="xs"
                href={transactionsLink}
                target={'_blank'}
                iconType="popout"
                iconSide="right"
              >
                {i18n.translate(
                  'xpack.apm.embeddedTransactionsTable.linkText',
                  {
                    defaultMessage: 'View Transactions',
                  }
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      {showMaxTransactionGroupsExceededWarning && maxTransactionGroupsExceeded && (
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
            iconType="alert"
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
        <EuiFlexItem>
          <OverviewTableContainer
            fixedHeight={fixedHeight}
            isEmptyAndNotInitiated={
              transactionGroupsTotalItems === 0 && isNotInitiated
            }
          >
            <EuiBasicTable
              loading={isLoading}
              noItemsMessage={
                isLoading
                  ? i18n.translate('xpack.apm.transactionsTable.loading', {
                      defaultMessage: 'Loading...',
                    })
                  : i18n.translate('xpack.apm.transactionsTable.noResults', {
                      defaultMessage: 'No transactions found',
                    })
              }
              error={
                hasFailed
                  ? i18n.translate('xpack.apm.transactionsTable.errorMessage', {
                      defaultMessage: 'Failed to fetch',
                    })
                  : ''
              }
              items={transactionGroups}
              columns={selectiveColumns}
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
              }}
            />
          </OverviewTableContainer>
        </EuiFlexItem>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
