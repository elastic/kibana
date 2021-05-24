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
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { TransactionOverviewLink } from '../../../shared/Links/apm/transaction_overview_link';
import { TableFetchWrapper } from '../../../shared/table_fetch_wrapper';
import { getTimeRangeComparison } from '../../../shared/time_comparison/get_time_range_comparison';
import { ServiceOverviewTableContainer } from '../service_overview_table_container';
import { getColumns } from './get_columns';

interface Props {
  serviceName: string;
}

type ApiResponse = APIReturnType<'GET /api/apm/services/{serviceName}/transactions/groups/main_statistics'>;
const INITIAL_STATE = {
  transactionGroups: [] as ApiResponse['transactionGroups'],
  isAggregationAccurate: true,
  requestId: '',
  transactionGroupsTotalItems: 0,
};

type SortField = 'name' | 'latency' | 'throughput' | 'errorRate' | 'impact';
type SortDirection = 'asc' | 'desc';
const PAGE_SIZE = 5;
const DEFAULT_SORT = {
  direction: 'desc' as const,
  field: 'impact' as const,
};

export function ServiceOverviewTransactionsTable({ serviceName }: Props) {
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

  const { pageIndex, sort } = tableOptions;
  const { direction, field } = sort;

  const { transactionType } = useApmServiceContext();
  const {
    urlParams: {
      start,
      end,
      latencyAggregationType,
      comparisonType,
      comparisonEnabled,
      environment,
      kuery,
    },
  } = useUrlParams();

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
          'GET /api/apm/services/{serviceName}/transactions/groups/main_statistics',
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
        ).slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);

        return {
          ...response,
          // Everytime the main statistics is refetched, updates the requestId making the detailed API to be refetched.
          requestId: uuid(),
          transactionGroupsTotalItems: response.transactionGroups.length,
          transactionGroups: currentPageTransactionGroups,
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

  const { transactionGroups, requestId, transactionGroupsTotalItems } = data;

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
        return callApmApi({
          endpoint:
            'GET /api/apm/services/{serviceName}/transactions/groups/detailed_statistics',
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
  });

  const isLoading =
    status === FETCH_STATUS.LOADING ||
    transactionGroupDetailedStatisticsStatus === FETCH_STATUS.LOADING;

  const pagination = {
    pageIndex,
    pageSize: PAGE_SIZE,
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
                {i18n.translate(
                  'xpack.apm.serviceOverview.transactionsTableTitle',
                  {
                    defaultMessage: 'Transactions',
                  }
                )}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TransactionOverviewLink
              serviceName={serviceName}
              latencyAggregationType={latencyAggregationType}
              transactionType={transactionType}
            >
              {i18n.translate(
                'xpack.apm.serviceOverview.transactionsTableLinkText',
                {
                  defaultMessage: 'View transactions',
                }
              )}
            </TransactionOverviewLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexItem>
          <TableFetchWrapper status={status}>
            <ServiceOverviewTableContainer
              isEmptyAndLoading={transactionGroupsTotalItems === 0 && isLoading}
            >
              <EuiBasicTable
                loading={isLoading}
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
            </ServiceOverviewTableContainer>
          </TableFetchWrapper>
        </EuiFlexItem>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
