/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTablePagination,
  EuiTitle,
} from '@elastic/eui';
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
  const query = kqlQuery ? `"${groupBy}": ${group} and ${kqlQuery}` : `"${groupBy}": ${group}`;
  let groupName = group.toLowerCase();
  if (groupBy === 'slo.indicator.type') {
    groupName = SLI_OPTIONS.find((option) => option.value === group)?.text ?? group;
  }

  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  // TODO get sortBy and sortDirection from parent
  const {
    isLoading,
    isRefetching,
    isError,
    data: sloList,
  } = useFetchSloList({
    kqlQuery: query,
    sortBy: sort,
    sortDirection: direction,
    perPage: itemsPerPage,
    page: page + 1,
  });
  const { results = [], total = 0 } = sloList ?? {};

  const handlePageClick = (pageNumber: number) => {
    setPage(pageNumber);
  };

  const groupTitle = `${groupName} (${total})`;

  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexGroup>
        <EuiFlexItem>
          <MemoEuiAccordion
            buttonContent={
              <EuiTitle size="xs">
                <h3>{groupTitle}</h3>
              </EuiTitle>
            }
            id={group}
            initialIsOpen={false}
          >
            <>
              <EuiSpacer size="m" />
              <SlosView
                sloList={results}
                loading={isLoading || isRefetching}
                error={isError}
                isCompact={isCompact}
                sloView={sloView}
                group={group}
              />
              <EuiSpacer size="m" />
              <EuiTablePagination
                pageCount={Math.ceil(total / itemsPerPage)}
                activePage={page}
                onChangePage={handlePageClick}
                itemsPerPage={itemsPerPage}
                onChangeItemsPerPage={(perPage) => setItemsPerPage(perPage)}
              />
            </>
          </MemoEuiAccordion>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

const MemoEuiAccordion = memo(EuiAccordion);
