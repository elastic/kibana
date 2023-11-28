/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { AsyncComponent } from '../../../components/async_component';
import { useProfilingDependencies } from '../../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { FlameGraph } from '../../../components/flamegraph';
import { NormalizationMode, NormalizationOptions } from '../../../components/normalization_menu';
import { useProfilingParams } from '../../../hooks/use_profiling_params';
import { useProfilingRoutePath } from '../../../hooks/use_profiling_route_path';
import { useProfilingRouter } from '../../../hooks/use_profiling_router';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useTimeRangeAsync } from '../../../hooks/use_time_range_async';
import { DifferentialFlameGraphSearchPanel } from './differential_flame_graph_search_panel';
import { FramesSummary } from '../../../components/frames_summary';
import { AsyncStatus } from '../../../hooks/use_async';

export function DifferentialFlameGraphsView() {
  const {
    query,
    query: {
      rangeFrom,
      rangeTo,
      kuery,
      comparisonRangeFrom,
      comparisonRangeTo,
      comparisonKuery,
      comparisonMode,
      baseline = 1,
      comparison = 1,
      normalizationMode,
      searchText,
    },
  } = useProfilingParams('/flamegraphs/differential');
  const routePath = useProfilingRoutePath();
  const profilingRouter = useProfilingRouter();

  const timeRange = useTimeRange({ rangeFrom, rangeTo });

  const comparisonTimeRange = useTimeRange({
    rangeFrom: comparisonRangeFrom,
    rangeTo: comparisonRangeTo,
    optional: true,
  });

  const {
    services: { fetchElasticFlamechart },
  } = useProfilingDependencies();

  const state = useTimeRangeAsync(
    ({ http }) => {
      return Promise.all([
        fetchElasticFlamechart({
          http,
          timeFrom: new Date(timeRange.start).getTime(),
          timeTo: new Date(timeRange.end).getTime(),
          kuery,
        }),
        comparisonTimeRange.start && comparisonTimeRange.end
          ? fetchElasticFlamechart({
              http,
              timeFrom: new Date(comparisonTimeRange.start).getTime(),
              timeTo: new Date(comparisonTimeRange.end).getTime(),
              kuery: comparisonKuery,
            })
          : Promise.resolve(undefined),
      ]).then(([primaryFlamegraph, comparisonFlamegraph]) => {
        return {
          primaryFlamegraph,
          comparisonFlamegraph,
        };
      });
    },
    [
      fetchElasticFlamechart,
      timeRange.start,
      timeRange.end,
      kuery,
      comparisonTimeRange.start,
      comparisonTimeRange.end,
      comparisonKuery,
    ]
  );

  const totalSeconds = timeRange.inSeconds.end - timeRange.inSeconds.start;
  const totalComparisonSeconds =
    (new Date(comparisonTimeRange.end!).getTime() -
      new Date(comparisonTimeRange.start!).getTime()) /
    1000;

  const baselineTime = 1;
  const comparisonTime = totalSeconds / totalComparisonSeconds;

  const normalizationOptions: NormalizationOptions = {
    baselineScale: baseline,
    baselineTime,
    comparisonScale: comparison,
    comparisonTime,
  };

  const { data } = state;

  const isNormalizedByTime = normalizationMode === NormalizationMode.Time;

  function handleSearchTextChange(newSearchText: string) {
    // @ts-expect-error Code gets too complicated to satisfy TS constraints
    profilingRouter.push(routePath, { query: { ...query, searchText: newSearchText } });
  }

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <EuiPanel hasShadow={false} color="subdued">
          <DifferentialFlameGraphSearchPanel
            comparisonMode={comparisonMode}
            normalizationMode={normalizationMode}
            normalizationOptions={normalizationOptions}
          />
          <EuiSpacer />
          <FramesSummary
            isLoading={state.status === AsyncStatus.Loading}
            baseValue={
              state.data?.primaryFlamegraph
                ? {
                    duration: totalSeconds,
                    selfCPU: state.data.primaryFlamegraph.SelfCPU,
                    totalCPU: state.data.primaryFlamegraph.TotalCPU,
                    totalCount: state.data.primaryFlamegraph.TotalSamples,
                    scaleFactor: isNormalizedByTime ? baselineTime : baseline,
                  }
                : undefined
            }
            comparisonValue={
              state.data?.comparisonFlamegraph
                ? {
                    duration: totalComparisonSeconds,
                    selfCPU: state.data.comparisonFlamegraph.SelfCPU,
                    totalCPU: state.data.comparisonFlamegraph.TotalCPU,
                    totalCount: state.data.comparisonFlamegraph.TotalSamples,
                    scaleFactor: isNormalizedByTime ? comparisonTime : comparison,
                  }
                : undefined
            }
          />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <AsyncComponent {...state} style={{ height: '100%' }} size="xl">
          <FlameGraph
            id="flamechart"
            primaryFlamegraph={data?.primaryFlamegraph}
            comparisonFlamegraph={data?.comparisonFlamegraph}
            comparisonMode={comparisonMode}
            baseline={isNormalizedByTime ? baselineTime : baseline}
            comparison={isNormalizedByTime ? comparisonTime : comparison}
            searchText={searchText}
            onChangeSearchText={handleSearchTextChange}
          />
        </AsyncComponent>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
