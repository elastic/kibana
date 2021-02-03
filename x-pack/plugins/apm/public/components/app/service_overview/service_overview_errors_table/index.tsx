/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty, orderBy } from 'lodash';
import React, { useState } from 'react';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { ErrorOverviewLink } from '../../../shared/Links/apm/ErrorOverviewLink';
import { TableFetchWrapper } from '../../../shared/table_fetch_wrapper';
import { ServiceOverviewTableContainer } from '../service_overview_table_container';
import { getColumns } from './get_column';

interface Props {
  serviceName: string;
}

type SortDirection = 'asc' | 'desc';
type SortField = 'name' | 'last_seen' | 'occurrences';

const PAGE_SIZE = 5;
const DEFAULT_SORT = {
  direction: 'desc' as const,
  field: 'occurrences' as const,
};

export function ServiceOverviewErrorsTable({ serviceName }: Props) {
  const {
    urlParams: { start, end },
    uiFilters,
  } = useUrlParams();
  const { transactionType } = useApmServiceContext();
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

  const {
    data = {
      totalItemCount: 0,
      items: [],
      requestId: '',
    },
    status,
  } = useFetcher(
    (callApmApi) => {
      if (!start || !end || !transactionType) {
        return;
      }

      return callApmApi({
        endpoint: 'GET /api/apm/services/{serviceName}/error_groups',
        params: {
          path: { serviceName },
          query: {
            start,
            end,
            uiFilters: JSON.stringify(uiFilters),
            transactionType,
          },
        },
      }).then((response) => {
        return {
          requestId: response.requestId,
          items: response.error_groups,
          totalItemCount: response.total_error_groups,
        };
      });
    },
    [start, end, serviceName, uiFilters, transactionType]
  );

  const { items, totalItemCount, requestId } = data;
  const currentPageErrorGroups = orderBy(
    items,
    (group) => {
      if (sort.field === 'occurrences') {
        return group.occurrences.value;
      }
      return group[sort.field];
    },
    sort.direction
  ).slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);

  const groupIds = JSON.stringify(
    currentPageErrorGroups.map(({ group_id: groupId }) => groupId)
  );
  const {
    data: groupIdsErrorAggResults,
    status: groupIdsErrorAggResultsStatus,
  } = useFetcher(
    (callApmApi) => {
      async function fetchAggResults() {
        if (
          !isEmpty(requestId) &&
          groupIds &&
          start &&
          end &&
          transactionType
        ) {
          const aggResults = await callApmApi({
            endpoint:
              'GET /api/apm/services/{serviceName}/error_groups/agg_results',
            params: {
              path: { serviceName },
              query: {
                start,
                end,
                uiFilters: JSON.stringify(uiFilters),
                numBuckets: 20,
                transactionType,
                groupIds,
              },
            },
            isCachable: true,
          });
          return { [requestId]: aggResults };
        }
      }
      return fetchAggResults();
    },
    // only fetches agg results when requestId changes or group ids change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requestId, groupIds]
  );

  const columns = getColumns({
    serviceName,
    groupIdsErrorAggResults: groupIdsErrorAggResults
      ? groupIdsErrorAggResults[requestId]
      : undefined,
  });

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.apm.serviceOverview.errorsTableTitle', {
                  defaultMessage: 'Errors',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ErrorOverviewLink serviceName={serviceName}>
              {i18n.translate('xpack.apm.serviceOverview.errorsTableLinkText', {
                defaultMessage: 'View errors',
              })}
            </ErrorOverviewLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <TableFetchWrapper status={status}>
          <ServiceOverviewTableContainer
            isEmptyAndLoading={
              items.length === 0 && status === FETCH_STATUS.LOADING
            }
          >
            <EuiBasicTable
              columns={columns}
              items={currentPageErrorGroups}
              pagination={{
                pageIndex,
                pageSize: PAGE_SIZE,
                totalItemCount,
                pageSizeOptions: [PAGE_SIZE],
                hidePerPageOptions: true,
              }}
              loading={
                status === FETCH_STATUS.LOADING ||
                groupIdsErrorAggResultsStatus === FETCH_STATUS.LOADING
              }
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
              sorting={{
                enableAllColumns: true,
                sort,
              }}
            />
          </ServiceOverviewTableContainer>
        </TableFetchWrapper>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
