/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppMountParameters, CoreSetup, CoreStart } from '@kbn/core/public';
import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { Router } from 'react-router-dom';

import { EuiSpacer, EuiTabbedContent } from '@elastic/eui';

import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { ChartGrid } from './components/chart_grid';
import { TopNContext } from './components/contexts/topn';
import { StackedBarChart } from './components/stacked_bar_chart';
import { StackTraceNavigation } from './components/stacktrace_nav';

import { FlameGraphContext } from './components/contexts/flamegraph';
import { FlameGraph } from './components/flamegraph';
import { FlameGraphNavigation } from './components/flamegraph_nav';

import { buildTimeRange } from '../common/build_time_range';
import { commonlyUsedRanges } from '../common/commonly_used_ranges';
import { ElasticFlameGraph } from '../common/flamegraph';
import { TopNSample, TopNSubchart } from '../common/topn';
import { ProfilingDependenciesContextProvider } from './components/contexts/profiling_dependencies/profiling_dependencies_context';
import { ProfilingAppPageTemplate } from './components/profiling_app_page_template';
import { Services } from './services';
import { ProfilingPluginPublicSetupDeps, ProfilingPluginPublicStartDeps } from './types';

interface Props {
  profilingFetchServices: Services;
  coreStart: CoreStart;
  coreSetup: CoreSetup;
  pluginsStart: ProfilingPluginPublicStartDeps;
  pluginsSetup: ProfilingPluginPublicSetupDeps;
  theme$: AppMountParameters['theme$'];
  history: AppMountParameters['history'];
}

const storage = new Storage(localStorage);

function App({
  coreStart,
  coreSetup,
  pluginsStart,
  pluginsSetup,
  profilingFetchServices: { fetchTopN, fetchElasticFlamechart },
  theme$,
  history,
}: Props) {
  const defaultTimeRange = buildTimeRange(commonlyUsedRanges[0].start, commonlyUsedRanges[0].end);
  const [timeRange, setTimeRange] = useState(defaultTimeRange);

  const [index, setIndex] = useState('profiling-events-all');
  const [projectID, setProjectID] = useState(5);
  const [n, setN] = useState(100);

  const [topn, setTopN] = useState<{ samples: TopNSample[]; subcharts: TopNSubchart[] }>({
    samples: [],
    subcharts: [],
  });

  const [elasticFlamegraph, setElasticFlamegraph] = useState<ElasticFlameGraph>();

  const updateIndex = (idx: string) => setIndex(idx);
  const updateProjectID = (projectId: number) => setProjectID(projectId);
  const updateN = (nextN: number) => setN(nextN);

  const tabs = [
    {
      id: 'stacktrace-elastic',
      name: 'Stack Traces',
      content: (
        <>
          <EuiSpacer />
          <TopNContext.Provider value={topn}>
            <StackTraceNavigation
              index={index}
              projectID={projectID}
              n={n}
              timeRange={timeRange}
              fetchTopN={fetchTopN}
              setTopN={setTopN}
            />
            <StackedBarChart
              id="topn"
              name="topn"
              height={400}
              x="Timestamp"
              y="Count"
              category="Category"
            />
            <ChartGrid maximum={10} />
          </TopNContext.Provider>
        </>
      ),
    },
    {
      id: 'flamegraph-elastic',
      name: 'FlameGraph',
      content: (
        <>
          <EuiSpacer />
          <FlameGraphContext.Provider value={elasticFlamegraph}>
            <FlameGraphNavigation
              index={index}
              projectID={projectID}
              n={n}
              timeRange={timeRange}
              getter={fetchElasticFlamechart}
              setter={setElasticFlamegraph}
            />
            <FlameGraph id="flamechart" height={600} />
          </FlameGraphContext.Provider>
        </>
      ),
    },
  ];

  const profilingDependencies = useMemo(() => {
    return {
      start: {
        core: coreStart,
        ...pluginsStart,
      },
      setup: {
        core: coreSetup,
        ...pluginsSetup,
      },
    };
  }, [coreStart, coreSetup, pluginsStart, pluginsSetup]);

  return (
    <KibanaThemeProvider theme$={theme$}>
      <KibanaContextProvider services={{ ...coreStart, ...pluginsStart, storage }}>
        <Router history={history}>
          <ProfilingDependenciesContextProvider value={profilingDependencies}>
            <ProfilingAppPageTemplate
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              index={index}
              onIndexChange={updateIndex}
              projectID={projectID}
              onProjectIDChange={updateProjectID}
              n={n}
              onNChange={updateN}
            >
              <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} autoFocus="selected" />
            </ProfilingAppPageTemplate>
          </ProfilingDependenciesContextProvider>
        </Router>
      </KibanaContextProvider>
    </KibanaThemeProvider>
  );
}

export const renderApp = (props: Props, element: AppMountParameters['element']) => {
  ReactDOM.render(<App {...props} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
