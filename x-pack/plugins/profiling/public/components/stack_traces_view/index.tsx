/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiPageHeaderContentProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
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
    query,
    query: { rangeFrom, rangeTo, projectID, n, index },
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

  const [topn, setTopN] = useState<{ samples: TopNSample[]; subcharts: TopNSubchart[] }>({
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
    fetchTopN(
      topNType,
      index,
      projectID,
      new Date(timeRange.start).getTime() / 1000,
      new Date(timeRange.end).getTime() / 1000,
      n
    ).then((response: TopNSamples) => {
      const samples = response.TopN;
      const subcharts = groupSamplesByCategory(samples);
      const samplesWithoutZero = samples.filter((sample: TopNSample) => sample.Count > 0);
      setTopN({ samples: samplesWithoutZero, subcharts });
    });
  }, [topNType, timeRange.start, timeRange.end, fetchTopN, index, projectID, n]);

  return (
    <ProfilingAppPageTemplate tabs={tabs}>
      <TopNContext.Provider value={topn}>
        <StackedBarChart
          id="topn"
          name="topn"
          height={400}
          x="Timestamp"
          y="Count"
          category="Category"
        />
        <ChartGrid maximum={10} />
        {children}
      </TopNContext.Provider>
    </ProfilingAppPageTemplate>
  );
}
