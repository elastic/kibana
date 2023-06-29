/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { TypeOf } from '@kbn/typed-react-router-config';
import React from 'react';
import { AsyncComponent } from '../../../components/async_component';
import { useProfilingDependencies } from '../../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import {
  NormalizationMenu,
  NormalizationMode,
  NormalizationOptions,
} from '../../../components/normalization_menu';
import { PrimaryAndComparisonSearchBar } from '../../../components/primary_and_comparison_search_bar';
import { TopNFunctionsTable } from '../../../components/topn_functions';
import { useProfilingParams } from '../../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../../../hooks/use_profiling_route_path';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useTimeRangeAsync } from '../../../hooks/use_time_range_async';
import { ProfilingRoutes } from '../../../routing';

export function DifferentialTopNFunctionsView() {
  const {
    path,
    query,
    query: {
      rangeFrom,
      rangeTo,
      kuery,
      sortDirection,
      sortField,
      comparisonKuery,
      normalizationMode,
      comparisonRangeFrom,
      comparisonRangeTo,
      baseline = 1,
      comparison = 1,
    },
  } = useProfilingParams('/functions/differential');

  const timeRange = useTimeRange({ rangeFrom, rangeTo });
  const comparisonTimeRange = useTimeRange({
    rangeFrom: comparisonRangeFrom,
    rangeTo: comparisonRangeTo,
    optional: true,
  });

  const totalSeconds = timeRange.inSeconds.end - timeRange.inSeconds.start;
  const totalComparisonSeconds =
    (new Date(comparisonTimeRange.end!).getTime() -
      new Date(comparisonTimeRange.start!).getTime()) /
    1000;

  const comparisonTime = totalSeconds / totalComparisonSeconds;

  const baselineTime = 1;
  const normalizationOptions: NormalizationOptions = {
    baselineScale: baseline,
    baselineTime,
    comparisonScale: comparison,
    comparisonTime,
  };

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

  const comparisonState = useTimeRangeAsync(
    ({ http }) => {
      if (!comparisonTimeRange.inSeconds.start || !comparisonTimeRange.inSeconds.end) {
        return undefined;
      }
      return fetchTopNFunctions({
        http,
        timeFrom: comparisonTimeRange.inSeconds.start,
        timeTo: comparisonTimeRange.inSeconds.end,
        startIndex: 0,
        endIndex: 100000,
        kuery: comparisonKuery,
      });
    },
    [
      comparisonTimeRange.inSeconds.start,
      comparisonTimeRange.inSeconds.end,
      comparisonKuery,
      fetchTopNFunctions,
    ]
  );

  const routePath = useProfilingRoutePath() as
    | '/functions'
    | '/functions/topn'
    | '/functions/differential';

  const profilingRouter = useProfilingRouter();

  function onChangeNormalizationMode(
    nextNormalizationMode: NormalizationMode,
    options: NormalizationOptions
  ) {
    profilingRouter.push(routePath, {
      path: routePath,
      query:
        nextNormalizationMode === NormalizationMode.Scale
          ? {
              ...query,
              baseline: options.baselineScale,
              comparison: options.comparisonScale,
              normalizationMode: nextNormalizationMode,
            }
          : {
              ...query,
              normalizationMode: nextNormalizationMode,
            },
    });
  }

  const isNormalizedByTime = normalizationMode === NormalizationMode.Time;

  function handleOnFrameClick(functionName: string) {
    profilingRouter.push('/flamegraphs/flamegraph', {
      path: {},
      query: { ...query, searchText: functionName },
    });
  }

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <PrimaryAndComparisonSearchBar />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <NormalizationMenu
            mode={normalizationMode}
            options={normalizationOptions}
            onChange={onChangeNormalizationMode}
          />
        </EuiFlexItem>
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
                  isDifferentialView={true}
                  baselineScaleFactor={isNormalizedByTime ? baselineTime : baseline}
                  onFrameClick={handleOnFrameClick}
                />
              </AsyncComponent>
            </EuiFlexItem>
            {comparisonTimeRange.inSeconds.start && comparisonTimeRange.inSeconds.end ? (
              <EuiFlexItem>
                <AsyncComponent {...comparisonState} size="xl" alignTop>
                  <TopNFunctionsTable
                    sortDirection={sortDirection}
                    sortField={sortField}
                    onSortChange={(nextSort) => {
                      profilingRouter.push(routePath, {
                        path,
                        query: {
                          ...(query as TypeOf<ProfilingRoutes, '/functions/differential'>['query']),
                          sortField: nextSort.sortField,
                          sortDirection: nextSort.sortDirection,
                        },
                      });
                    }}
                    topNFunctions={comparisonState.data}
                    comparisonTopNFunctions={state.data}
                    totalSeconds={
                      comparisonTimeRange.inSeconds.end - comparisonTimeRange.inSeconds.start
                    }
                    isDifferentialView={true}
                    baselineScaleFactor={isNormalizedByTime ? comparisonTime : comparison}
                    comparisonScaleFactor={isNormalizedByTime ? baselineTime : baseline}
                    onFrameClick={handleOnFrameClick}
                  />
                </AsyncComponent>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
