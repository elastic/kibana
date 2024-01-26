/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, EuiTablePagination } from '@elastic/eui';
import React, { useState } from 'react';
import { GroupListView } from './group_list_view';
import { useFetchSloGroups } from '../../../../hooks/slo/use_fetch_slo_groups';
import type { SortDirection } from '../slo_list_search_bar';
import { DEFAULT_SLO_GROUPS_PAGE_SIZE } from '../../../../../common/slo/constants';

interface Props {
  isCompact: boolean;
  groupBy: string;
  kqlQuery: string;
  sloView: string;
  sort: string;
  direction: SortDirection;
}

export function GroupView({ isCompact, kqlQuery, sloView, sort, direction, groupBy }: Props) {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(DEFAULT_SLO_GROUPS_PAGE_SIZE);
  const { data, isLoading } = useFetchSloGroups({ perPage, page: page + 1, groupBy });
  const { results = [], total = 0 } = data ?? {};
  const handlePageClick = (pageNumber: number) => {
    setPage(pageNumber);
  };

  if (isLoading) {
    return (
      <div>
        {i18n.translate('xpack.observability.groupView.div.loadingLabel', {
          defaultMessage: 'Loading',
        })}
      </div>
    );
  }
  return (
    <>
      {results &&
        results.map((result) => {
          return (
            <GroupListView
              groupBy={result.groupBy}
              key={result.group}
              sloView={sloView}
              group={result.group}
              kqlQuery={kqlQuery}
              isCompact={isCompact}
              sort={sort}
              direction={direction}
            />
          );
        })}

      {total > 0 ? (
        <EuiFlexItem>
          <EuiTablePagination
            pageCount={Math.ceil(total / perPage)}
            activePage={page}
            onChangePage={handlePageClick}
            itemsPerPage={perPage}
            itemsPerPageOptions={[10, 25, 50, 100]}
            onChangeItemsPerPage={(newPerPage) => {
              setPerPage(newPerPage);
            }}
          />
        </EuiFlexItem>
      ) : null}
    </>
  );
}
