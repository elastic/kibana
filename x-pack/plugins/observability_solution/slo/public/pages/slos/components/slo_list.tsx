/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTablePagination } from '@elastic/eui';
import { useIsMutating } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import dedent from 'dedent';
import { groupBy as _groupBy, mapValues } from 'lodash';
import { useKibana } from '../../../utils/kibana_react';
import { useFetchSloList } from '../../../hooks/use_fetch_slo_list';
import { useUrlSearchState } from '../hooks/use_url_search_state';
import { SlosView } from './slos_view';
import { ToggleSLOView } from './toggle_slo_view';
import { GroupView } from './grouped_slos/group_view';

export function SloList() {
  const { state, onStateChange } = useUrlSearchState();
  const { view, page, perPage, kqlQuery, filters, tagsFilter, statusFilter, groupBy } = state;

  const {
    isLoading,
    isRefetching,
    isError,
    data: sloList,
  } = useFetchSloList({
    tagsFilter,
    statusFilter,
    perPage,
    filters,
    page: page + 1,
    kqlQuery,
    sortBy: state.sort.by,
    sortDirection: state.sort.direction,
    lastRefresh: state.lastRefresh,
  });

  const {
    observabilityAIAssistant: {
      service: { setScreenContext },
    },
  } = useKibana().services;
  const { results = [], total = 0 } = sloList ?? {};

  const isDeletingSlo = Boolean(useIsMutating(['deleteSlo']));

  useEffect(() => {
    if (!sloList) {
      return;
    }

    const slosByStatus = mapValues(
      _groupBy(sloList.results, (result) => result.summary.status),
      (groupResults) => groupResults.map((result) => `- ${result.name}`).join('\n')
    ) as Record<typeof results[number]['summary']['status'], string>;

    return setScreenContext({
      screenDescription: dedent(`The user is looking at a list of SLOs.

      ${
        sloList.total >= 1
          ? `There are ${sloList.total} SLOs. Out of those, ${sloList.results.length} are visible.

          Violating SLOs:
          ${slosByStatus.VIOLATED}

          Degrading SLOs:
          ${slosByStatus.DEGRADING}

          Healthy SLOs:
          ${slosByStatus.HEALTHY}

          SLOs without data:
          ${slosByStatus.NO_DATA}

          `
          : ''
      }
      `),
    });
  }, [sloList, setScreenContext]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="sloList">
      <EuiFlexItem grow={false}>
        <ToggleSLOView
          sloList={sloList}
          sloView={view}
          onChangeView={(newView) => onStateChange({ view: newView })}
          onStateChange={onStateChange}
          state={state}
          loading={isLoading || isDeletingSlo}
        />
      </EuiFlexItem>
      {groupBy === 'ungrouped' && (
        <>
          <SlosView
            sloList={results}
            loading={isLoading || isRefetching}
            error={isError}
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
                  onStateChange({ perPage: newPerPage });
                }}
              />
            </EuiFlexItem>
          ) : null}
        </>
      )}
      {groupBy !== 'ungrouped' && (
        <GroupView
          sloView={view}
          groupBy={groupBy}
          kqlQuery={kqlQuery}
          sort={state.sort.by}
          direction={state.sort.direction}
        />
      )}
    </EuiFlexGroup>
  );
}
