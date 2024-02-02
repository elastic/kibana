/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexItem, EuiTablePagination, EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { GroupListView } from './group_list_view';
import { useFetchSloGroups } from '../../../../hooks/slo/use_fetch_slo_groups';
import { useUrlSearchState } from '../../hooks/use_url_search_state';
import { SloGroupListError } from './group_list_error';
import { SloGroupListEmpty } from './group_list_empty';
import type { SortDirection } from '../slo_list_search_bar';

interface Props {
  groupBy: string;
  kqlQuery: string;
  sloView: string;
  sort: string;
  direction: SortDirection;
}

export function GroupView({ kqlQuery, sloView, sort, direction, groupBy }: Props) {
  const { state, store: storeState } = useUrlSearchState();
  const { tagsFilter, statusFilter, filters, page, perPage } = state;

  const { data, isLoading, isError } = useFetchSloGroups({
    perPage,
    page: page + 1,
    groupBy,
    kqlQuery,
    tagsFilter,
    statusFilter,
    filters,
  });
  const { results = [], total = 0 } = data ?? {};
  const handlePageClick = (pageNumber: number) => {
    storeState({ page: pageNumber });
  };

  if (isLoading) {
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
        results.map((result) => {
          return (
            <GroupListView
              groupBy={result.groupBy}
              key={result.group}
              sloView={sloView}
              group={result.group}
              kqlQuery={kqlQuery}
              sort={sort}
              direction={direction}
              summary={{
                worst: result.summary.worst,
                total: result.summary.total,
                violated: result.summary.violated,
              }}
              filters={filters}
            />
          );
        })}

      {total > 0 ? (
        <EuiFlexItem>
          <EuiTablePagination
            data-test-subj="sloGroupListPagination"
            pageCount={Math.ceil(total / perPage)}
            activePage={page}
            onChangePage={handlePageClick}
            itemsPerPage={perPage}
            itemsPerPageOptions={[10, 25, 50, 100]}
            onChangeItemsPerPage={(newPerPage) => {
              storeState({ perPage: newPerPage });
            }}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexItem>
  );
}
