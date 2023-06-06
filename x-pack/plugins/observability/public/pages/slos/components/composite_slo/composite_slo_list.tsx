/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPagination } from '@elastic/eui';
import React, { useState } from 'react';
import { useFetchCompositeSloList } from '../../../../hooks/composite_slo/use_fetch_composite_slo_list';
import { CompositeSloListItems } from './composite_slo_list_items';

export interface Props {
  autoRefresh: boolean;
}

export function CompositeSloList({ autoRefresh }: Props) {
  const [activePage, setActivePage] = useState(0);

  const { isLoading, isRefetching, isError, data, refetch } = useFetchCompositeSloList({
    page: activePage + 1,
    shouldRefetch: autoRefresh,
  });

  const { results = [], total = 0, perPage = 0 } = data || {};

  const handlePageClick = (pageNumber: number) => {
    setActivePage(pageNumber);
    refetch();
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="compositeSloList">
      <EuiFlexItem>
        <CompositeSloListItems
          compositeSloList={results}
          loading={isLoading || isRefetching}
          error={isError}
        />
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
