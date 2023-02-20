/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPagination } from '@elastic/eui';
import { debounce, noop } from 'lodash';
import { useIsMutating } from '@tanstack/react-query';

import { useFetchSloList } from '../../../hooks/slo/use_fetch_slo_list_rq';
import {
  FilterType,
  SloListSearchFilterSortBar,
  SortType,
} from './slo_list_search_filter_sort_bar';
import { SloListItems } from './slo_list_items';

export function SloList() {
  const [activePage, setActivePage] = useState(0);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortType>('name');
  const [indicatorTypeFilter, setIndicatorTypeFilter] = useState<FilterType[]>([]);

  const {
    isLoading: isLoadingSloList,
    isError: error,
    sloList: { results: sloList = [], total, perPage },
    refetch,
  } = useFetchSloList({
    page: activePage + 1,
    name: query,
    sortBy: sort,
    indicatorTypes: indicatorTypeFilter,
  });

  const isDeletingSlo = Boolean(useIsMutating(['deleteSlo']));
  const isCloningSlo = Boolean(useIsMutating(['createSlo']));

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
          loading={isLoadingSloList || isDeletingSlo || isCloningSlo}
          onChangeQuery={handleChangeQuery}
          onChangeSort={handleChangeSort}
          onChangeIndicatorTypeFilter={handleChangeIndicatorTypeFilter}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <SloListItems
          sloList={sloList}
          loading={isLoadingSloList}
          error={error}
          onCloned={noop}
          onCloning={noop}
          onDeleting={noop}
          onDeleted={noop}
        />
      </EuiFlexItem>

      {sloList.length ? (
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
