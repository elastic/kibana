/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTablePagination } from '@elastic/eui';
import { useIsMutating } from '@tanstack/react-query';
import React from 'react';
import { CreateSloBtn } from './common/create_slo_btn';
import { useFetchSloList } from '../../../hooks/slo/use_fetch_slo_list';
import { SearchState, useUrlSearchState } from '../hooks/use_url_search_state';
import { SlosView } from './slos_view';
import { SloListSearchBar } from './slo_list_search_bar';
import { ToggleSLOView } from './toggle_slo_view';

export function SloList() {
  const { state, store: storeState } = useUrlSearchState();
  const { view, page, perPage, kqlQuery, filters, compact: isCompact, tags } = state;

  const {
    isLoading,
    isRefetching,
    isError,
    data: sloList,
  } = useFetchSloList({
    tags,
    perPage,
    filters,
    page: page + 1,
    kqlQuery,
    sortBy: state.sort.by,
    sortDirection: state.sort.direction,
    lastRefresh: state.lastRefresh,
  });

  const { results = [], total = 0 } = sloList ?? {};

  const isCreatingSlo = Boolean(useIsMutating(['creatingSlo']));
  const isCloningSlo = Boolean(useIsMutating(['cloningSlo']));
  const isUpdatingSlo = Boolean(useIsMutating(['updatingSlo']));
  const isDeletingSlo = Boolean(useIsMutating(['deleteSlo']));

  const onStateChange = (newState: Partial<SearchState>) => {
    storeState({ page: 0, ...newState });
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="sloList">
      <EuiFlexItem grow>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={true}>
            <SloListSearchBar
              query={kqlQuery}
              filters={filters}
              loading={isLoading || isCreatingSlo || isCloningSlo || isUpdatingSlo || isDeletingSlo}
              onStateChange={onStateChange}
              initialState={state}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <CreateSloBtn />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiSpacer size="xs" />
      <EuiFlexItem grow={false}>
        <ToggleSLOView
          sloList={sloList}
          sloView={view}
          onChangeView={(newView) => onStateChange({ view: newView })}
          onToggleCompactView={() => onStateChange({ compact: !isCompact })}
          isCompact={isCompact}
          loading={isLoading || isCreatingSlo || isCloningSlo || isUpdatingSlo || isDeletingSlo}
          onStateChange={onStateChange}
          initialState={state}
        />
      </EuiFlexItem>
      <SlosView
        sloList={results}
        loading={isLoading || isRefetching}
        error={isError}
        isCompact={isCompact}
        sloView={view}
      />

      {total > 0 ? (
        <EuiFlexItem>
          <EuiTablePagination
            pageCount={Math.ceil(total / perPage)}
            activePage={page}
            onChangePage={(newPage) => {
              onStateChange({ page: newPage });
            }}
            itemsPerPage={perPage}
            itemsPerPageOptions={[10, 25, 50, 100]}
            onChangeItemsPerPage={(newPerPage) => {
              storeState({ perPage: newPerPage, page: 0 });
            }}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}
