/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeaderContentProps,
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { StackTracesDisplayOption } from '../../../common/stack_traces';
import {
  groupSamplesByCategory,
  TopNSample,
  TopNSamples,
  TopNSubchart,
} from '../../../common/topn';
import { useProfilingParams } from '../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../../hooks/use_profiling_route_path';
import { useTimeRange } from '../../hooks/use_time_range';
import { ChartGrid } from '../chart_grid';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { TopNContext } from '../contexts/topn';
import { ProfilingAppPageTemplate } from '../profiling_app_page_template';
import { StackedBarChart } from '../stacked_bar_chart';

export function StackTracesView({ children }: { children: React.ReactElement }) {
  const routePath = useProfilingRoutePath();

  const profilingRouter = useProfilingRouter();

  const {
    path,
    query,
    query: { rangeFrom, rangeTo, projectID, n, index, kuery, displayAs },
  } = useProfilingParams('/stacktraces/*');

  const tabs: Required<EuiPageHeaderContentProps>['tabs'] = [
    {
      label: i18n.translate('xpack.profiling.stackTracesView.containersTabLabel', {
        defaultMessage: 'Containers',
      }),
      isSelected: routePath === '/stacktraces/containers',
      href: profilingRouter.link('/stacktraces/containers', { query }),
    },
    {
      label: i18n.translate('xpack.profiling.stackTracesView.deploymentsTabLabel', {
        defaultMessage: 'Deployments',
      }),
      isSelected: routePath === '/stacktraces/deployments',
      href: profilingRouter.link('/stacktraces/deployments', { query }),
    },
    {
      label: i18n.translate('xpack.profiling.stackTracesView.threadsTabLabel', {
        defaultMessage: 'Threads',
      }),
      isSelected: routePath === '/stacktraces/threads',
      href: profilingRouter.link('/stacktraces/threads', { query }),
    },
    {
      label: i18n.translate('xpack.profiling.stackTracesView.hostsTabLabel', {
        defaultMessage: 'Hosts',
      }),
      isSelected: routePath === '/stacktraces/hosts',
      href: profilingRouter.link('/stacktraces/hosts', { query }),
    },
    {
      label: i18n.translate('xpack.profiling.stackTracesView.tracesTabLabel', {
        defaultMessage: 'Traces',
      }),
      isSelected: routePath === '/stacktraces/traces',
      href: profilingRouter.link('/stacktraces/traces', { query }),
    },
  ];

  const topNType = routePath.split('/')[2];

  const [topn, setTopN] = useState<{
    samples: TopNSample[];
    subcharts: TopNSubchart[];
  }>({
    samples: [],
    subcharts: [],
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
      setTopN({ samples: [], subcharts: [] });
      return;
    }

    fetchTopN({
      type: topNType,
      index,
      projectID,
      timeFrom: new Date(timeRange.start).getTime() / 1000,
      timeTo: new Date(timeRange.end).getTime() / 1000,
      n,
      kuery,
    }).then((response: TopNSamples) => {
      const samples = response.TopN;
      const subcharts = groupSamplesByCategory(samples);
      const samplesWithNullValues = samples.map((sample) => {
        return sample.Count === 0 ? { ...sample, Count: null } : sample;
      });
      setTopN({ samples: samplesWithNullValues, subcharts });
    });
  }, [topNType, timeRange.start, timeRange.end, fetchTopN, index, projectID, n, kuery]);

  return (
    <ProfilingAppPageTemplate tabs={tabs}>
      <TopNContext.Provider value={topn}>
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
                id="topn"
                name="topn"
                height={400}
                x="Timestamp"
                y="Count"
                category="Category"
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
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
        <ChartGrid maximum={10} />
        {children}
      </TopNContext.Provider>
    </ProfilingAppPageTemplate>
  );
}
