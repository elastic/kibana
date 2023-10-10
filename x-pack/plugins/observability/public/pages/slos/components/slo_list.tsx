/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPagination } from '@elastic/eui';
import { useIsMutating } from '@tanstack/react-query';
import React, { useState } from 'react';
import { useFetchSloList } from '../../../hooks/slo/use_fetch_slo_list';
import { useStoreSearchState } from '../hooks/use_store_search_state';
import { SloListItems } from './slo_list_items';
import { SloListSearchBar, SortField } from './slo_list_search_bar';

export interface Props {
  autoRefresh: boolean;
}

export function SloList({ autoRefresh }: Props) {
  const { state } = useStoreSearchState();

  const [activePage, setActivePage] = useState(state.page);
  const [query, setQuery] = useState(state.kqlQuery);
  const [sort, setSort] = useState<SortField | undefined>(state.sort.by);

  const {
    isLoading,
    isRefetching,
    isError,
    data: sloList,
  } = useFetchSloList({
    page: activePage + 1,
    kqlQuery: query,
    sortBy: sort,
    sortDirection: state.sort.direction,
    shouldRefetch: autoRefresh,
  });

  const { results = [], total = 0, perPage = 0 } = sloList ?? {};

  const isCreatingSlo = Boolean(useIsMutating(['creatingSlo']));
  const isCloningSlo = Boolean(useIsMutating(['cloningSlo']));
  const isUpdatingSlo = Boolean(useIsMutating(['updatingSlo']));
  const isDeletingSlo = Boolean(useIsMutating(['deleteSlo']));

  const handlePageClick = (pageNumber: number) => {
    setActivePage(pageNumber);
  };

  const handleChangeQuery = (newQuery: string) => {
    setActivePage(0);
    setQuery(newQuery);
  };

  const handleChangeSort = (newSort: SortField | undefined) => {
    setActivePage(0);
    setSort(newSort);
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

      <EuiFlexItem>
        <SloListItems sloList={results} loading={isLoading || isRefetching} error={isError} />
      </EuiFlexItem>

      {results.length ? (
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexEnd">
            <EuiFlexItem>
              <EuiPagination
                pageCount={Math.ceil(total / perPage)}
                activePage={activePage}
                onPageClick={handlePageClick}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}
