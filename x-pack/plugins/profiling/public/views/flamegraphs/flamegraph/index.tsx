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
import { FlameGraph } from '../../../components/flamegraph';
import { useProfilingParams } from '../../../hooks/use_profiling_params';
import { useProfilingRoutePath } from '../../../hooks/use_profiling_route_path';
import { useProfilingRouter } from '../../../hooks/use_profiling_router';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useTimeRangeAsync } from '../../../hooks/use_time_range_async';

export function FlameGraphView() {
  const {
    query,
    query: { rangeFrom, rangeTo, kuery, searchText },
  } = useProfilingParams('/flamegraphs/flamegraph');

  const timeRange = useTimeRange({ rangeFrom, rangeTo });

  const {
    services: { fetchElasticFlamechart },
  } = useProfilingDependencies();

  const state = useTimeRangeAsync(
    ({ http }) => {
      return fetchElasticFlamechart({
        http,
        timeFrom: new Date(timeRange.start).getTime(),
        timeTo: new Date(timeRange.end).getTime(),
        kuery,
      });
    },
    [fetchElasticFlamechart, timeRange.start, timeRange.end, kuery]
  );

  const { data } = state;

  const routePath = useProfilingRoutePath();

  const profilingRouter = useProfilingRouter();

  function handleSearchTextChange(newSearchText: string) {
    // @ts-expect-error Code gets too complicated to satisfy TS constraints
    profilingRouter.push(routePath, { query: { ...query, searchText: newSearchText } });
  }

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <AsyncComponent {...state} style={{ height: '100%' }} size="xl">
          <FlameGraph
            id="flamechart"
            primaryFlamegraph={data}
            searchText={searchText}
            onChangeSearchText={handleSearchTextChange}
          />
        </AsyncComponent>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
