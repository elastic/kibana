/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexItem, EuiTablePagination, EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import React, { useState } from 'react';
import { GroupListView } from './group_list_view';
import { useFetchSloGroups } from '../../../../hooks/slo/use_fetch_slo_groups';
import { useUrlSearchState } from '../../hooks/use_url_search_state';
import { SloGroupListError } from './group_list_error';
import { SloGroupListEmpty } from './group_list_empty';
import type { SortDirection } from '../slo_list_search_bar';
import { DEFAULT_SLO_GROUPS_PAGE_SIZE } from '../../../../../common/slo/constants';

interface Props {
  isCompact: boolean;
  groupBy: string;
  kqlQuery: string;
  sloView: string;
  sort: string;
  direction: SortDirection;
}

export function GroupView({ isCompact, kqlQuery, sloView, sort, direction, groupBy }: Props) {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(DEFAULT_SLO_GROUPS_PAGE_SIZE);
  const { state } = useUrlSearchState();
  const { tags, filters } = state;

  const { data, isLoading, isError } = useFetchSloGroups({
    perPage,
    page: page + 1,
    groupBy,
    kqlQuery,
    tags,
    filters,
  });
  const { results = [], total = 0 } = data ?? {};
  const handlePageClick = (pageNumber: number) => {
    setPage(pageNumber);
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
              isCompact={isCompact}
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
              setPerPage(newPerPage);
            }}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexItem>
  );
}
