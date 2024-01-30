/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { EuiPanel, EuiAccordion, EuiTablePagination, EuiSpacer } from '@elastic/eui';
import { Filter } from '@kbn/es-query';
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
  filters: Filter[];
}

export function GroupListView({
  isCompact,
  group,
  kqlQuery,
  sloView,
  sort,
  direction,
  groupBy,
  filters,
}: Props) {
  const query = kqlQuery ? `"${groupBy}": (${group}) and ${kqlQuery}` : `"${groupBy}": ${group}`;
  let groupName = group.toLowerCase();
  if (groupBy === 'slo.indicator.type') {
    groupName = SLI_OPTIONS.find((option) => option.value === group)?.text ?? group;
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
    filters,
  });
  const { results = [], total = 0 } = sloList ?? {};

  const handlePageClick = (pageNumber: number) => {
    setPage(pageNumber);
  };

  const groupTitle = `${groupName} (${total})`;

  return (
    <>
      <EuiPanel data-test-subj="sloGroupViewPanel">
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
      <EuiSpacer size="m" />
    </>
  );
}

const MemoEuiAccordion = memo(EuiAccordion);
