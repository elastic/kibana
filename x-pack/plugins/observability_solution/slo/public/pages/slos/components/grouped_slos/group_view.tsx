/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiEmptyPrompt, EuiFlexItem, EuiLoadingSpinner, EuiTablePagination } from '@elastic/eui';
import { Filter } from '@kbn/es-query';
import React, { useEffect } from 'react';
import { useFetchSloGroups } from '../../../../hooks/use_fetch_slo_groups';
import type { SortDirection } from '../../hooks/use_url_search_state';
import { SortField, useUrlSearchState } from '../../hooks/use_url_search_state';
import { GroupByField } from '../slo_list_group_by';
import { SLOView } from '../toggle_slo_view';
import { SloGroupListEmpty } from './group_list_empty';
import { SloGroupListError } from './group_list_error';
import { GroupListView } from './group_list_view';

interface Props {
  groupBy: GroupByField;
  kqlQuery?: string;
  view: SLOView;
  sort?: SortField;
  direction?: SortDirection;
  filters?: Filter[];
  lastRefreshTime?: number;
  groupsFilter?: string[];
}

export function GroupView({
  kqlQuery,
  view,
  sort,
  direction,
  groupBy,
  groupsFilter,
  filters,
  lastRefreshTime,
}: Props) {
  const { state, onStateChange } = useUrlSearchState();
  const { tagsFilter, statusFilter, page, perPage, lastRefresh } = state;
  const { data, isLoading, isError, isRefetching, refetch } = useFetchSloGroups({
    perPage,
    page: page + 1,
    groupBy,
    kqlQuery,
    tagsFilter,
    statusFilter,
    filters,
    lastRefresh,
    groupsFilter,
  });

  useEffect(() => {
    refetch();
  }, [lastRefreshTime, refetch]);

  const { results = [], total = 0 } = data ?? {};
  const handlePageClick = (pageNumber: number) => {
    onStateChange({ page: pageNumber });
  };

  if (isLoading || isRefetching) {
    return (
      <EuiEmptyPrompt
        data-test-subj="sloGroupListLoading"
        title={<EuiLoadingSpinner size="xl" />}
      />
    );
  }

  if (!isLoading && !isError && results.length === 0) {
    return <SloGroupListEmpty />;
  }

  if (!isLoading && isError) {
    return <SloGroupListError />;
  }
  return (
    <EuiFlexItem data-test-subj="sloGroupView">
      {results &&
        results.map((result) => (
          <GroupListView
            groupBy={result.groupBy}
            key={result.group}
            view={view}
            group={result.group}
            kqlQuery={kqlQuery}
            sort={sort}
            direction={direction}
            summary={result.summary}
            filters={filters}
          />
        ))}

      {total > 0 && total > perPage ? (
        <EuiFlexItem>
          <EuiTablePagination
            data-test-subj="sloGroupListPagination"
            pageCount={Math.ceil(total / perPage)}
            activePage={page}
            onChangePage={handlePageClick}
            itemsPerPage={perPage}
            itemsPerPageOptions={[10, 25, 50, 100]}
            onChangeItemsPerPage={(newPerPage) => {
              onStateChange({ perPage: newPerPage, page: 0 });
            }}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexItem>
  );
}
