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
import { SloListItems } from './slo_list_items';
import { SloListSearchFilterSortBar, SortField } from './slo_list_search_filter_sort_bar';

export interface Props {
  autoRefresh: boolean;
}

export function SloList({ autoRefresh }: Props) {
  const [activePage, setActivePage] = useState(0);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortField | undefined>('status');

  const { isInitialLoading, isLoading, isRefetching, isError, sloList, refetch } = useFetchSloList({
    page: activePage + 1,
    kqlQuery: query,
    sortBy: sort,
    sortDirection: 'desc',
    shouldRefetch: autoRefresh,
  });

  const { results = [], total = 0, perPage = 0 } = sloList || {};

  const isCreatingSlo = Boolean(useIsMutating(['creatingSlo']));
  const isCloningSlo = Boolean(useIsMutating(['cloningSlo']));
  const isUpdatingSlo = Boolean(useIsMutating(['updatingSlo']));
  const isDeletingSlo = Boolean(useIsMutating(['deleteSlo']));

  const handlePageClick = (pageNumber: number) => {
    setActivePage(pageNumber);
    refetch();
  };

  const handleChangeQuery = (newQuery: string) => {
    setActivePage(0);
    setQuery(newQuery);
    refetch();
  };

  const handleChangeSort = (newSort: SortField | undefined) => {
    setActivePage(0);
    setSort(newSort);
    refetch();
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="sloList">
      <EuiFlexItem grow>
        <SloListSearchFilterSortBar
          loading={
            isInitialLoading ||
            isLoading ||
            isRefetching ||
            isCreatingSlo ||
            isCloningSlo ||
            isUpdatingSlo ||
            isDeletingSlo
          }
          onChangeQuery={handleChangeQuery}
          onChangeSort={handleChangeSort}
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
