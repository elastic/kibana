/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPagination } from '@elastic/eui';
import { debounce } from 'lodash';
import { useIsMutating } from '@tanstack/react-query';

import { useFetchSloList } from '../../../hooks/slo/use_fetch_slo_list';
import {
  FilterType,
  SloListSearchFilterSortBar,
  SortType,
} from './slo_list_search_filter_sort_bar';
import { SloListItems } from './slo_list_items';

export interface Props {
  autoRefresh: boolean;
}

export function SloList({ autoRefresh }: Props) {
  const [activePage, setActivePage] = useState(0);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortType>('creationTime');
  const [indicatorTypeFilter, setIndicatorTypeFilter] = useState<FilterType[]>([]);

  const { isInitialLoading, isLoading, isRefetching, isError, sloList, refetch } = useFetchSloList({
    page: activePage + 1,
    name: query,
    sortBy: sort,
    indicatorTypes: indicatorTypeFilter,
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

  const handleChangeQuery = useMemo(
    () =>
      debounce((e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
      }, 300),
    []
  );

  const handleChangeSort = (newSort: SortType) => {
    setSort(newSort);
  };

  const handleChangeIndicatorTypeFilter = (newFilter: FilterType[]) => {
    setIndicatorTypeFilter(newFilter);
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
          onChangeIndicatorTypeFilter={handleChangeIndicatorTypeFilter}
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
