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
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { ErrorOverviewLink } from '../../../shared/links/apm/error_overview_link';
import { OverviewTableContainer } from '../../../shared/overview_table_container';
import { getColumns } from './get_columns';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';

interface Props {
  serviceName: string;
}
type ErrorGroupMainStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics'>;
type ErrorGroupDetailedStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/groups/detailed_statistics'>;

type SortDirection = 'asc' | 'desc';
type SortField = 'name' | 'lastSeen' | 'occurrences';

const PAGE_SIZE = 5;
const DEFAULT_SORT = {
  direction: 'desc' as const,
  field: 'occurrences' as const,
};

const INITIAL_STATE_MAIN_STATISTICS: {
  items: ErrorGroupMainStatistics['errorGroups'];
  totalItems: number;
  requestId?: string;
} = {
  items: [],
  totalItems: 0,
  requestId: undefined,
};

const INITIAL_STATE_DETAILED_STATISTICS: ErrorGroupDetailedStatistics = {
  currentPeriod: {},
  previousPeriod: {},
};

export function ServiceOverviewErrorsTable({ serviceName }: Props) {
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

  const { query } = useApmParams('/services/{serviceName}/overview');

  const { environment, kuery, rangeFrom, rangeTo, offset, comparisonEnabled } =
    query;

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { pageIndex, sort } = tableOptions;
  const { direction, field } = sort;

  const { data = INITIAL_STATE_MAIN_STATISTICS, status } = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return;
      }
      return callApmApi(
        'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics',
        {
          params: {
            path: { serviceName },
            query: {
              environment,
              kuery,
              start,
              end,
            },
          },
        }
      ).then((response) => {
        const currentPageErrorGroups = orderBy(
          response.errorGroups,
          field,
          direction
        ).slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);

        return {
          // Everytime the main statistics is refetched, updates the requestId making the comparison API to be refetched.
          requestId: uuid(),
          items: currentPageErrorGroups,
          totalItems: response.errorGroups.length,
        };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      environment,
      kuery,
      start,
      end,
      serviceName,
      pageIndex,
      direction,
      field,
      // not used, but needed to trigger an update when offset is changed either manually by user or when time range is changed
      offset,
      // not used, but needed to trigger an update when comparison feature is disabled/enabled by user
      comparisonEnabled,
    ]
  );

  const { requestId, items, totalItems } = data;

  const {
    data: errorGroupDetailedStatistics = INITIAL_STATE_DETAILED_STATISTICS,
    status: errorGroupDetailedStatisticsStatus,
  } = useFetcher(
    (callApmApi) => {
      if (requestId && items.length && start && end) {
        return callApmApi(
          'GET /internal/apm/services/{serviceName}/errors/groups/detailed_statistics',
          {
            params: {
              path: { serviceName },
              query: {
                environment,
                kuery,
                start,
                end,
                numBuckets: 20,
                groupIds: JSON.stringify(
                  items.map(({ groupId: groupId }) => groupId).sort()
                ),
                offset: comparisonEnabled ? offset : undefined,
              },
            },
          }
        );
      }
    },
    // only fetches agg results when requestId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requestId],
    { preservePreviousData: false }
  );

  const errorGroupDetailedStatisticsLoading =
    errorGroupDetailedStatisticsStatus === FETCH_STATUS.LOADING;

  const columns = getColumns({
    serviceName,
    errorGroupDetailedStatisticsLoading,
    errorGroupDetailedStatistics,
    comparisonEnabled,
    query,
  });

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      data-test-subj="serviceOverviewErrorsTable"
    >
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
            <ErrorOverviewLink serviceName={serviceName} query={query}>
              {i18n.translate('xpack.apm.serviceOverview.errorsTableLinkText', {
                defaultMessage: 'View errors',
              })}
            </ErrorOverviewLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <OverviewTableContainer
          fixedHeight={true}
          isEmptyAndNotInitiated={
            totalItems === 0 && status === FETCH_STATUS.NOT_INITIATED
          }
        >
          <EuiBasicTable
            error={
              status === FETCH_STATUS.FAILURE
                ? i18n.translate(
                    'xpack.apm.serviceOverview.errorsTable.errorMessage',
                    { defaultMessage: 'Failed to fetch' }
                  )
                : ''
            }
            noItemsMessage={
              status === FETCH_STATUS.LOADING
                ? i18n.translate(
                    'xpack.apm.serviceOverview.errorsTable.loading',
                    { defaultMessage: 'Loading...' }
                  )
                : i18n.translate(
                    'xpack.apm.serviceOverview.errorsTable.noResults',
                    { defaultMessage: 'No errors found' }
                  )
            }
            columns={columns}
            items={items}
            pagination={{
              pageIndex,
              pageSize: PAGE_SIZE,
              totalItemCount: totalItems,
              pageSizeOptions: [PAGE_SIZE],
              showPerPageOptions: false,
            }}
            loading={status === FETCH_STATUS.LOADING}
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
        </OverviewTableContainer>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
