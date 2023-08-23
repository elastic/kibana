/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { FlameGraph } from '@kbn/profiling-shared-ui';
import {
  NormalizationMode,
  NormalizationOptions,
} from '@kbn/profiling-shared-ui/common/normalization_options';
import React from 'react';
import { AsyncComponent } from '../../../components/async_component';
import { useProfilingDependencies } from '../../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { useProfilingParams } from '../../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../../../hooks/use_profiling_route_path';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useTimeRangeAsync } from '../../../hooks/use_time_range_async';
import { DifferentialFlameGraphSearchPanel } from './differential_flame_graph_search_panel';

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
    start: {
      core: { docLinks },
    },
  } = useProfilingDependencies();

  const state = useTimeRangeAsync(
    ({ http }) => {
      return Promise.all([
        fetchElasticFlamechart({
          http,
          timeFrom: timeRange.inSeconds.start,
          timeTo: timeRange.inSeconds.end,
          kuery,
        }),
        comparisonTimeRange.inSeconds.start && comparisonTimeRange.inSeconds.end
          ? fetchElasticFlamechart({
              http,
              timeFrom: comparisonTimeRange.inSeconds.start,
              timeTo: comparisonTimeRange.inSeconds.end,
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
      timeRange.inSeconds.start,
      timeRange.inSeconds.end,
      kuery,
      comparisonTimeRange.inSeconds.start,
      comparisonTimeRange.inSeconds.end,
      comparisonKuery,
      fetchElasticFlamechart,
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
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <AsyncComponent {...state} style={{ height: '100%' }} size="xl">
          <FlameGraph
            id="flamechart"
            data={data?.primaryFlamegraph}
            comparisonData={data?.comparisonFlamegraph}
            searchText={searchText}
            onSearchTextChange={handleSearchTextChange}
            comparisonMode={comparisonMode}
            baselineScaleFactor={isNormalizedByTime ? baselineTime : baseline}
            comparisonScaleFactor={isNormalizedByTime ? comparisonTime : comparison}
            elasticWebsiteUrl={docLinks.ELASTIC_WEBSITE_URL}
            dockLinkVersion={docLinks.DOC_LINK_VERSION}
            onUploadSymbolsClick={(selectedTab) => {
              profilingRouter.push('/add-data-instructions', {
                path: {},
                query: { selectedTab },
              });
            }}
          />
        </AsyncComponent>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
