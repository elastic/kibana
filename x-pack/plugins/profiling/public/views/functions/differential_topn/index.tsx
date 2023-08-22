/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiDataGridRefProps,
  EuiDataGridSorting,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import React, { useRef } from 'react';
import { GridOnScrollProps } from 'react-window';
import { TopNFunctionSortField } from '../../../../common/functions';
import { AsyncComponent } from '../../../components/async_component';
import { useProfilingDependencies } from '../../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import {
  NormalizationMenu,
  NormalizationMode,
  NormalizationOptions,
} from '../../../components/normalization_menu';
import { PrimaryAndComparisonSearchBar } from '../../../components/primary_and_comparison_search_bar';
import { TopNFunctionsGrid } from '../../../components/topn_functions';
import { TopNFunctionsSummary } from '../../../components/topn_functions_summary';
import { AsyncStatus } from '../../../hooks/use_async';
import { useProfilingParams } from '../../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../../../hooks/use_profiling_route_path';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useTimeRangeAsync } from '../../../hooks/use_time_range_async';

export function DifferentialTopNFunctionsView() {
  const baseGridRef = useRef<EuiDataGridRefProps>(null);
  const comparisonGridRef = useRef<EuiDataGridRefProps>(null);
  const { query } = useProfilingParams('/functions/differential');
  const {
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
    pageIndex = 0,
  } = query;

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

  function handleBaseGridScroll(scroll: GridOnScrollProps) {
    if (comparisonGridRef?.current?.scrollTo) {
      comparisonGridRef.current.scrollTo({
        scrollTop: scroll.scrollTop,
      });
    }
  }

  function handleComparisonGridScroll(scroll: GridOnScrollProps) {
    if (baseGridRef?.current?.scrollTo) {
      baseGridRef.current.scrollTo({ scrollTop: scroll.scrollTop });
    }
  }

  function handlePageChange(nextPage: number) {
    profilingRouter.push('/functions/differential', {
      path: {},
      query: { ...query, pageIndex: nextPage },
    });
  }

  function handleSortChange(sorting: EuiDataGridSorting['columns'][0]) {
    profilingRouter.push('/functions/differential', {
      path: {},
      query: {
        ...query,
        sortField: sorting.id as TopNFunctionSortField,
        sortDirection: sorting.direction,
      },
    });
  }

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiPanel hasShadow={false} color="subdued">
            <PrimaryAndComparisonSearchBar />
            <EuiHorizontalRule />
            <NormalizationMenu
              mode={normalizationMode}
              options={normalizationOptions}
              onChange={onChangeNormalizationMode}
            />
            <EuiSpacer />
            <TopNFunctionsSummary
              baselineTopNFunctions={state.data}
              comparisonTopNFunctions={comparisonState.data}
              baselineScaleFactor={isNormalizedByTime ? baselineTime : baseline}
              comparisonScaleFactor={isNormalizedByTime ? comparisonTime : comparison}
              isLoading={
                state.status === AsyncStatus.Loading ||
                comparisonState.status === AsyncStatus.Loading
              }
              baselineDuration={totalSeconds}
              comparisonDuration={totalComparisonSeconds}
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={false} />
        <EuiFlexItem>
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiFlexItem>
              <AsyncComponent {...state} size="xl" alignTop>
                <TopNFunctionsGrid
                  ref={baseGridRef}
                  topNFunctions={state.data}
                  totalSeconds={timeRange.inSeconds.end - timeRange.inSeconds.start}
                  isDifferentialView={true}
                  onFrameClick={handleOnFrameClick}
                  baselineScaleFactor={isNormalizedByTime ? baselineTime : baseline}
                  onScroll={handleBaseGridScroll}
                  pageIndex={pageIndex}
                  onChangePage={handlePageChange}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onChangeSort={handleSortChange}
                />
              </AsyncComponent>
            </EuiFlexItem>
            {comparisonTimeRange.inSeconds.start && comparisonTimeRange.inSeconds.end ? (
              <EuiFlexItem>
                <AsyncComponent {...comparisonState} size="xl" alignTop>
                  <TopNFunctionsGrid
                    ref={comparisonGridRef}
                    topNFunctions={comparisonState.data}
                    baselineScaleFactor={isNormalizedByTime ? comparisonTime : comparison}
                    comparisonTopNFunctions={state.data}
                    comparisonScaleFactor={isNormalizedByTime ? baselineTime : baseline}
                    totalSeconds={totalSeconds}
                    isDifferentialView={true}
                    onFrameClick={handleOnFrameClick}
                    onScroll={handleComparisonGridScroll}
                    showDiffColumn
                    pageIndex={pageIndex}
                    onChangePage={handlePageChange}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onChangeSort={handleSortChange}
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
