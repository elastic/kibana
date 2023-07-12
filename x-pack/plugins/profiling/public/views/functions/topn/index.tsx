/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { AsyncComponent } from '../../../components/async_component';
import { useProfilingDependencies } from '../../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { TopNFunctionsTable } from '../../../components/topn_functions';
import { useProfilingParams } from '../../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../../../hooks/use_profiling_route_path';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useTimeRangeAsync } from '../../../hooks/use_time_range_async';

export function TopNFunctionsView() {
  const {
    path,
    query,
    query: { rangeFrom, rangeTo, kuery, sortDirection, sortField },
  } = useProfilingParams('/functions/topn');

  const timeRange = useTimeRange({ rangeFrom, rangeTo });

  const {
    services: { fetchTopNFunctions },
  } = useProfilingDependencies();

  const state = useTimeRangeAsync(
    ({ http }) => {
      return fetchTopNFunctions({
        http,
        timeFrom: timeRange.inSeconds.start,
        timeTo: timeRange.inSeconds.end,
        startIndex: 0,
        endIndex: 100000,
        kuery,
      });
    },
    [timeRange.inSeconds.start, timeRange.inSeconds.end, kuery, fetchTopNFunctions]
  );

  const routePath = useProfilingRoutePath() as '/functions/topn';

  const profilingRouter = useProfilingRouter();

  function handleOnFrameClick(functionName: string) {
    profilingRouter.push('/flamegraphs/flamegraph', {
      path: {},
      query: { ...query, searchText: functionName },
    });
  }

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiFlexItem>
              <AsyncComponent {...state} size="xl" alignTop>
                <TopNFunctionsTable
                  topNFunctions={state.data}
                  sortDirection={sortDirection}
                  sortField={sortField}
                  onSortChange={(nextSort) => {
                    profilingRouter.push(routePath, {
                      path,
                      query: {
                        ...query,
                        sortField: nextSort.sortField,
                        sortDirection: nextSort.sortDirection,
                      },
                    });
                  }}
                  totalSeconds={timeRange.inSeconds.end - timeRange.inSeconds.start}
                  isDifferentialView={false}
                  onFrameClick={handleOnFrameClick}
                />
              </AsyncComponent>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
