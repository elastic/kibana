/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiButtonGroup, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { StackTracesDisplayOption, TopNType } from '../../../common/stack_traces';
import { groupSamplesByCategory, TopNResponse, TopNSample } from '../../../common/topn';
import { useProfilingParams } from '../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../../hooks/use_profiling_route_path';
import { useTimeRange } from '../../hooks/use_time_range';
import { useTimeRangeAsync } from '../../hooks/use_time_range_async';
import { AsyncComponent } from '../async_component';
import { ChartGrid } from '../chart_grid';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { ProfilingAppPageTemplate } from '../profiling_app_page_template';
import { StackedBarChart } from '../stacked_bar_chart';
import { getStackTracesTabs } from './get_stack_traces_tabs';

export function StackTracesView() {
  const routePath = useProfilingRoutePath();

  const profilingRouter = useProfilingRouter();

  const {
    path,
    query,
    path: { topNType },
    query: { rangeFrom, rangeTo, kuery, displayAs, limit: limitFromQueryParams },
  } = useProfilingParams('/stacktraces/{topNType}');

  const limit = limitFromQueryParams || 10;

  const tabs = getStackTracesTabs({
    path,
    query,
    profilingRouter,
  });

  const {
    services: { fetchTopN },
  } = useProfilingDependencies();

  const timeRange = useTimeRange({
    rangeFrom,
    rangeTo,
  });

  const state = useTimeRangeAsync(
    ({ http }) => {
      if (!topNType) {
        return Promise.resolve({ charts: [], metadata: {} });
      }
      return fetchTopN({
        http,
        type: topNType,
        timeFrom: new Date(timeRange.start).getTime() / 1000,
        timeTo: new Date(timeRange.end).getTime() / 1000,
        kuery,
      }).then((response: TopNResponse) => {
        const totalCount = response.TotalCount;
        const samples = response.TopN;
        const charts = groupSamplesByCategory({
          samples,
          totalCount,
          metadata: response.Metadata,
          labels: response.Labels,
        });
        return {
          charts,
        };
      });
    },
    [topNType, timeRange.start, timeRange.end, fetchTopN, kuery]
  );

  const [highlightedSample, setHighlightedSample] = useState<TopNSample | null>(null);

  const highlightedSubchart =
    (highlightedSample &&
      state.data?.charts.find((chart) => chart.Category === highlightedSample?.Category)) ||
    null;

  const { data } = state;

  return (
    <ProfilingAppPageTemplate tabs={tabs}>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow>
          <EuiPanel>
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem>
                <EuiButtonGroup
                  idSelected={displayAs}
                  type="single"
                  onChange={(nextValue) => {
                    profilingRouter.push(routePath, {
                      path,
                      query: {
                        ...query,
                        displayAs: nextValue,
                      },
                    });
                  }}
                  options={[
                    {
                      id: StackTracesDisplayOption.StackTraces,
                      iconType: 'visLine',
                      label: i18n.translate(
                        'xpack.profiling.stackTracesView.stackTracesCountButton',
                        {
                          defaultMessage: 'Stack traces',
                        }
                      ),
                    },
                    {
                      id: StackTracesDisplayOption.Percentage,
                      iconType: 'percent',
                      label: i18n.translate('xpack.profiling.stackTracesView.percentagesButton', {
                        defaultMessage: 'Percentages',
                      }),
                    },
                  ]}
                  legend={i18n.translate('xpack.profiling.stackTracesView.displayOptionLegend', {
                    defaultMessage: 'Display option',
                  })}
                />
              </EuiFlexItem>
              <EuiFlexItem style={{ alignContent: 'center' }}>
                <AsyncComponent size="xl" {...state} style={{ height: 400 }}>
                  <StackedBarChart
                    height={400}
                    charts={data?.charts ?? []}
                    asPercentages={displayAs === StackTracesDisplayOption.Percentage}
                    onBrushEnd={(nextRange) => {
                      profilingRouter.push(routePath, {
                        path,
                        query: {
                          ...query,
                          rangeFrom: nextRange.rangeFrom,
                          rangeTo: nextRange.rangeTo,
                        },
                      });
                    }}
                    onSampleOver={(sample) => {
                      setHighlightedSample(sample);
                    }}
                    onSampleOut={() => {
                      setHighlightedSample(null);
                    }}
                    highlightedSample={highlightedSample}
                    highlightedSubchart={highlightedSubchart}
                    showFrames={topNType === TopNType.Traces}
                  />
                </AsyncComponent>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow>
          <AsyncComponent size="m" mono {...state} style={{ minHeight: 200 }}>
            <ChartGrid
              charts={data?.charts ?? []}
              limit={limit}
              showFrames={topNType === TopNType.Traces}
            />
          </AsyncComponent>
        </EuiFlexItem>
        {(data?.charts.length ?? 0) > limit ? (
          <EuiFlexItem>
            <EuiButton
              onClick={() => {
                profilingRouter.push(routePath, {
                  path,
                  query: {
                    ...query,
                    limit: limit + 10,
                  },
                });
              }}
            >
              {i18n.translate('xpack.profiling.stackTracesView.showMoreButton', {
                defaultMessage: 'Show more',
              })}
            </EuiButton>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </ProfilingAppPageTemplate>
  );
}
