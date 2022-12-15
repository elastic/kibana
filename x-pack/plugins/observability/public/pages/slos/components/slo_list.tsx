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
import { SloListSearchFilterSortBar, SortItem, SortType } from './slo_list_search_filter_sort_bar';
import { SloListItem } from './slo_list_item';
import { SloListEmpty } from './slo_list_empty';
import { sortSlos } from '../helpers/sort_slos';
import { filterSlos } from '../helpers/filter_slos';

export function SloList() {
  const [activePage, setActivePage] = useState(0);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortType | undefined>();
  const [filters, setFilters] = useState<SortItem[]>([]);

  const [deleting, setIsDeleting] = useState(false);
  const [shouldReload, setShouldReload] = useState(false);

  const {
    loading,
    sloList: { results: slos = [], total, perPage },
  } = useFetchSloList({ page: activePage + 1, name: query, refetch: shouldReload });

  useEffect(() => {
    if (shouldReload) {
      setShouldReload(false);
      setIsDeleting(false);
    }
  }, [shouldReload]);

  const handleDeleted = () => {
    setShouldReload(true);
  };

  const handleDeleting = () => {
    setIsDeleting(true);
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

  const handleChangeFilter = (newFilters: SortItem[]) => {
    setFilters(newFilters);
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="sloList">
      <EuiFlexItem grow>
        <SloListSearchFilterSortBar
          loading={loading || deleting}
          onChangeQuery={handleChangeQuery}
          onChangeSort={handleChangeSort}
          onChangeStatusFilter={handleChangeFilter}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="s">
          {slos.length ? (
            slos
              .filter(filterSlos(filters))
              .sort(sortSlos(sort))
              .map((slo) => (
                <EuiFlexItem key={slo.id}>
                  <SloListItem slo={slo} onDeleted={handleDeleted} onDeleting={handleDeleting} />
                </EuiFlexItem>
              ))
          ) : !loading ? (
            <SloListEmpty />
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>

      {slos.length ? (
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
