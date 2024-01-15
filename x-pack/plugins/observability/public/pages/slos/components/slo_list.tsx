/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTablePagination } from '@elastic/eui';
import { useIsMutating } from '@tanstack/react-query';
import React, { useState } from 'react';
import { useFetchSloList } from '../../../hooks/slo/use_fetch_slo_list';
import { useUrlSearchState } from '../hooks/use_url_search_state';
import { SlosView } from './slos_view';
import { SloListSearchBar, SortDirection, SortField } from './slo_list_search_bar';
import { SLOView, ToggleSLOView } from './toggle_slo_view';

export interface Props {
  autoRefresh: boolean;
}

export function SloList({ autoRefresh }: Props) {
  const { state, store: storeState } = useUrlSearchState();
  const [page, setPage] = useState(state.page);
  const [perPage, setPerPage] = useState(state.perPage);
  const [query, setQuery] = useState(state.kqlQuery);
  const [sort, setSort] = useState<SortField>(state.sort.by);
  const [direction] = useState<SortDirection>(state.sort.direction);
  const [view, setView] = useState<SLOView>(state.view);
  const [isCompact, setCompact] = useState<boolean>(state.compact);

  const {
    isLoading,
    isRefetching,
    isError,
    data: sloList,
  } = useFetchSloList({
    perPage,
    page: page + 1,
    kqlQuery: query,
    sortBy: sort,
    sortDirection: direction,
    shouldRefetch: autoRefresh,
  });

  const { results = [], total = 0 } = sloList ?? {};

  const isCreatingSlo = Boolean(useIsMutating(['creatingSlo']));
  const isCloningSlo = Boolean(useIsMutating(['cloningSlo']));
  const isUpdatingSlo = Boolean(useIsMutating(['updatingSlo']));
  const isDeletingSlo = Boolean(useIsMutating(['deleteSlo']));

  const handlePageClick = (pageNumber: number) => {
    setPage(pageNumber);
    storeState({ page: pageNumber });
  };

  const handleChangeQuery = (newQuery: string) => {
    setPage(0);
    setQuery(newQuery);
    storeState({ page: 0, kqlQuery: newQuery });
  };

  const handleChangeSort = (newSort: SortField) => {
    setPage(0);
    setSort(newSort);
    storeState({ page: 0, sort: { by: newSort, direction: state.sort.direction } });
  };

  const handleChangeView = (newView: SLOView) => {
    setView(newView);
    storeState({ view: newView });
  };

  const handleToggleCompactView = () => {
    const newCompact = !isCompact;
    setCompact(newCompact);
    storeState({ compact: newCompact });
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="sloList">
      <EuiFlexItem grow>
        <SloListSearchBar
          loading={isLoading || isCreatingSlo || isCloningSlo || isUpdatingSlo || isDeletingSlo}
          onChangeQuery={handleChangeQuery}
          onChangeSort={handleChangeSort}
          initialState={state}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ToggleSLOView
          sloView={view}
          onChangeView={handleChangeView}
          onToggleCompactView={handleToggleCompactView}
          isCompact={isCompact}
        />
      </EuiFlexItem>
      <SlosView
        sloList={results}
        loading={isLoading || isRefetching}
        error={isError}
        isCompact={isCompact}
        sloView={view}
      />

      {total > 0 ? (
        <EuiFlexItem>
          <EuiTablePagination
            pageCount={Math.ceil(total / perPage)}
            activePage={page}
            onChangePage={handlePageClick}
            itemsPerPage={perPage}
            itemsPerPageOptions={[10, 25, 50, 100]}
            onChangeItemsPerPage={(newPerPage) => {
              setPerPage(newPerPage);
              storeState({ perPage: newPerPage });
            }}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}
