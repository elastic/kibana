/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { EuiPanel, EuiAccordion, EuiTablePagination } from '@elastic/eui';
import { useFetchSloList } from '../../../../hooks/slo/use_fetch_slo_list';
import { SlosView } from '../slos_view';
import type { SortDirection } from '../slo_list_search_bar';
import { SLI_OPTIONS } from '../../../slo_edit/constants';

interface Props {
  isCompact: boolean;
  group: string;
  kqlQuery: string;
  sloView: string;
  sort: string;
  direction: SortDirection;
  groupBy: string;
}

export function GroupListView({
  isCompact,
  group,
  kqlQuery,
  sloView,
  sort,
  direction,
  groupBy,
}: Props) {
  let query = '';
  let groupName = '';
  switch (groupBy) {
    case 'tags':
      query = kqlQuery ? `"slo.tags": ${group} and ${kqlQuery}` : `"slo.tags": ${group}`;
      groupName = group;
      break;
    case 'status':
      query = kqlQuery ? `"status": ${group} and ${kqlQuery}` : `"status": ${group}`;
      groupName = group.toLowerCase();
      break;
    case 'sliType':
      query = kqlQuery
        ? `"slo.indicator.type": ${group} and ${kqlQuery}`
        : `"slo.indicator.type": ${group}`;
      groupName = SLI_OPTIONS.find((option) => option.value === group)?.text ?? group;
      break;
  }
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 10;
  const {
    isLoading,
    isRefetching,
    isError,
    data: sloList,
  } = useFetchSloList({
    kqlQuery: query,
    sortBy: sort,
    sortDirection: direction,
    perPage: ITEMS_PER_PAGE,
    page: page + 1,
  });
  const { results = [], total = 0 } = sloList ?? {};

  const handlePageClick = (pageNumber: number) => {
    setPage(pageNumber);
  };

  const groupTitle = `${groupName}(${total})`;

  return (
    <EuiPanel>
      <MemoEuiAccordion buttonContent={groupTitle} id={group} initialIsOpen={false}>
        <>
          <SlosView
            sloList={results}
            loading={isLoading || isRefetching}
            error={isError}
            isCompact={isCompact}
            sloView={sloView}
            group={group}
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
