/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPagination } from '@elastic/eui';
import { useIsMutating } from '@tanstack/react-query';
import React, { useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { SlosView } from './slos_view';
import { SLO_LIST_IS_COMPACT } from './slo_view_settings';
import { SLOViewType, ToggleSLOView } from './toggle_slo_view';
import { useFetchSloList } from '../../../hooks/slo/use_fetch_slo_list';
import { useUrlSearchState } from '../hooks/use_url_search_state';
import { SloListSearchBar, SortField } from './slo_list_search_bar';

export interface Props {
  autoRefresh: boolean;
}

export function SloList({ autoRefresh }: Props) {
  const { state, store: storeState } = useUrlSearchState();
  const [page, setPage] = useState(state.page);
  const [query, setQuery] = useState(state.kqlQuery);
  const [sort, setSort] = useState<SortField>(state.sort.by);
  const [direction] = useState<'asc' | 'desc'>(state.sort.direction);
  const [sloView, setSLOView] = useState<SLOViewType>('cardView');

  const {
    isLoading,
    isRefetching,
    isError,
    data: sloList,
  } = useFetchSloList({
    page: page + 1,
    kqlQuery: query,
    sortBy: sort,
    sortDirection: direction,
    shouldRefetch: autoRefresh,
  });

  const { results = [], total = 0, perPage = 0 } = sloList ?? {};

  const isCreatingSlo = Boolean(useIsMutating(['creatingSlo']));
  const isCloningSlo = Boolean(useIsMutating(['cloningSlo']));
  const isUpdatingSlo = Boolean(useIsMutating(['updatingSlo']));
  const isDeletingSlo = Boolean(useIsMutating(['deleteSlo']));
  const [isCompact, setIsCompact] = useLocalStorage<'true' | 'false'>(SLO_LIST_IS_COMPACT, 'true');
  const isCompactView = isCompact === 'true';

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
          sloView={sloView}
          setSLOView={setSLOView}
          toggleCompactView={() =>
            isCompact === 'true' ? setIsCompact('false') : setIsCompact('true')
          }
          isCompact={isCompactView}
        />
      </EuiFlexItem>
      <SlosView
        sloList={results}
        loading={isLoading || isRefetching}
        error={isError}
        isCompact={isCompactView}
        sloView={sloView}
      />

      {total > 0 ? (
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexEnd">
            <EuiFlexItem>
              <EuiPagination
                pageCount={Math.ceil(total / perPage)}
                activePage={page}
                onPageClick={handlePageClick}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}
