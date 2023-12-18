/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { EuiPanel, EuiAccordion, EuiTablePagination } from '@elastic/eui';
import { useFetchSloList } from '../../../../hooks/slo/use_fetch_slo_list';
import { SloListItems } from '../slo_list_items';
import { useUrlSearchState } from '../../hooks/use_url_search_state';

export function GroupListView({ isCompact, group, groupBy, kqlQuery }) {
  const query = kqlQuery ? `"slo.tags": ${group} and ${kqlQuery}` : `"slo.tags": ${group}`;
  const { state, store: storeState } = useUrlSearchState();
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 10;
  // TODO get sortBy and sortDirection from parent
  const {
    isLoading,
    isRefetching,
    isError,
    data: sloList,
  } = useFetchSloList({
    kqlQuery: query,
    perPage: ITEMS_PER_PAGE,
    page: page + 1,
  });
  const { results = [], total = 0 } = sloList ?? {};

  const handlePageClick = (pageNumber: number) => {
    setPage(pageNumber);
    // storeState({ page: pageNumber });
  };

  return (
    <EuiPanel>
      <MemoEuiAccordion buttonContent={group}>
        <>
          {/* TODO pass activeAlertsBySlo, currently compact view is broken */}
          <SloListItems
            sloList={results}
            loading={isLoading || isRefetching}
            error={isError}
            isCompact={isCompact}
          />
          <EuiTablePagination
            pageCount={Math.ceil(total / ITEMS_PER_PAGE)}
            activePage={page}
            onChangePage={handlePageClick}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </>
      </MemoEuiAccordion>
    </EuiPanel>
  );
}

const MemoEuiAccordion = memo(EuiAccordion);
