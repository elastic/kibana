/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { EuiFieldSearch, EuiFlexGroup, EuiFlexItem, EuiPagination } from '@elastic/eui';
import { debounce } from 'lodash';
import { i18n } from '@kbn/i18n';

import { useFetchSloList } from '../../../hooks/slo/use_fetch_slo_list';
import { SloListItem } from './slo_list_item';
import { SloListEmpty } from './slo_list_empty';

export function SloList() {
  const [activePage, setActivePage] = useState(0);
  const [query, setQuery] = useState('');

  const [shouldReload, setShouldReload] = useState(false);

  const {
    loading,
    sloList: { results: slos = [], total, perPage },
  } = useFetchSloList({ page: activePage + 1, name: query, refetch: shouldReload });

  useEffect(() => {
    if (shouldReload) {
      setShouldReload(false);
    }
  }, [shouldReload]);

  const handleDelete = () => {
    setShouldReload(true);
  };

  const handlePageClick = (pageNumber: number) => {
    setActivePage(pageNumber);
    setShouldReload(true);
  };

  const handleChangeQuery = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const debounceChange = useMemo(() => debounce(handleChangeQuery, 300), []);

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="sloList">
      <EuiFlexItem grow>
        <EuiFieldSearch
          fullWidth
          isLoading={loading}
          onChange={debounceChange}
          placeholder={i18n.translate('observability.slos.list.search', {
            defaultMessage: 'Search',
          })}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="s">
          {slos.length ? (
            slos.map((slo) => (
              <EuiFlexItem key={slo.id}>
                <SloListItem slo={slo} onDelete={handleDelete} />
              </EuiFlexItem>
            ))
          ) : !loading ? (
            <SloListEmpty />
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexEnd">
          <EuiFlexItem>
            <EuiPagination
              pageCount={total / perPage}
              activePage={activePage}
              onPageClick={handlePageClick}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
