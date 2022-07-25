/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiButtonGroup, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { StackTracesDisplayOption } from '../../../common/stack_traces';
import { groupSamplesByCategory, TopNSamples, TopNSubchart } from '../../../common/topn';
import { useProfilingParams } from '../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../../hooks/use_profiling_route_path';
import { useTimeRange } from '../../hooks/use_time_range';
import { ChartGrid } from '../chart_grid';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { TopNContext } from '../contexts/topn';
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

  const [topn, setTopN] = useState<{ charts: TopNSubchart[] }>({
    charts: [],
  });

  const {
    services: { fetchTopN },
  } = useProfilingDependencies();

  const timeRange = useTimeRange({
    rangeFrom,
    rangeTo,
  });

  useEffect(() => {
    if (!topNType) {
      setTopN({ charts: [] });
      return;
    }

    fetchTopN({
      type: topNType,
      timeFrom: new Date(timeRange.start).getTime() / 1000,
      timeTo: new Date(timeRange.end).getTime() / 1000,
      kuery,
    }).then((response: TopNSamples) => {
      const samples = response.TopN;
      const charts = groupSamplesByCategory(samples);
      setTopN({ charts });
    });
  }, [topNType, timeRange.start, timeRange.end, fetchTopN, kuery]);

  const [highlightedSubchart, setHighlightedSubchart] = useState<TopNSubchart | undefined>(
    undefined
  );

  return (
    <ProfilingAppPageTemplate tabs={tabs}>
      <TopNContext.Provider value={topn}>
        <EuiFlexGroup direction="column" alignItems="center">
          <EuiFlexItem style={{ width: '100%' }}>
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
                <EuiFlexItem>
                  <StackedBarChart
                    height={400}
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
                    onSampleClick={(sample) => {
                      setHighlightedSubchart(
                        topn.charts.find((subchart) => subchart.Category === sample.Category)
                      );
                    }}
                    onSampleOut={() => {
                      setHighlightedSubchart(undefined);
                    }}
                    highlightedSubchart={highlightedSubchart}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem style={{ width: '100%' }}>
            <ChartGrid maximum={Math.min(limit, topn.charts.length)} />
          </EuiFlexItem>
          {topn.charts.length > limit ? (
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
      </TopNContext.Provider>
    </ProfilingAppPageTemplate>
  );
}
