/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPagination } from '@elastic/eui';
import { debounce } from 'lodash';

import { useFetchSloList } from '../../../hooks/slo/use_fetch_slo_list';
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

  const [isCloning, setIsCloning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [shouldReload, setShouldReload] = useState(false);

  const {
    loading: isLoadingSloList,
    error,
    sloList: { results: sloList = [], total, perPage },
  } = useFetchSloList({
    page: activePage + 1,
    name: query,
    sortBy: sort,
    indicatorTypes: indicatorTypeFilter,
    refetch: shouldReload,
  });

  useEffect(() => {
    if (shouldReload) {
      setShouldReload(false);
      setIsCloning(false);
      setIsDeleting(false);
    }
  }, [shouldReload]);

  const handleCloning = (bla: boolean) => {
    setIsCloning(bla);
  };

  const handleDeleting = (bla: boolean) => {
    setIsDeleting(bla);
  };

  const handleClonedOrDeleted = () => {
    setShouldReload(true);
  };

  const handlePageClick = (pageNumber: number) => {
    setActivePage(pageNumber);
    setShouldReload(true);
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
          loading={isLoadingSloList || isCloning || isDeleting}
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
          onCloned={handleClonedOrDeleted}
          onCloning={handleCloning}
          onDeleting={handleDeleting}
          onDeleted={handleClonedOrDeleted}
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
