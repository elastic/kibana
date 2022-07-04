/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters } from '@kbn/core/public';

import dateMath from '@elastic/datemath';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiTabbedContent,
} from '@elastic/eui';

import { SettingsFlyout } from './components/settings_flyout';

import { TopNContext } from './components/contexts/topn';
import { StackTraceNavigation } from './components/stacktrace_nav';
import { StackedBarChart } from './components/stacked_bar_chart';
import { ChartGrid } from './components/chart_grid';

import { FlameGraphContext } from './components/contexts/flamegraph';
import { FlameGraphNavigation } from './components/flamegraph_nav';
import { FlameGraph } from './components/flamegraph';

import { Services } from './services';
import { TimeRange } from '../common/types';
import { TopNSample, TopNSubchart } from '../common/topn';
import { ElasticFlameGraph } from '../common/flamegraph';

interface CommonlyUsedRange {
  start: string;
  end: string;
  label: string;
}

const commonlyUsedRanges: CommonlyUsedRange[] = [
  {
    start: 'now-30m',
    end: 'now',
    label: 'Last 30 minutes',
  },
  {
    start: 'now-1h',
    end: 'now',
    label: 'Last hour',
  },
  {
    start: 'now-24h',
    end: 'now',
    label: 'Last 24 hours',
  },
  {
    start: 'now-1w',
    end: 'now',
    label: 'Last 7 days',
  },
  {
    start: 'now-30d',
    end: 'now',
    label: 'Last 30 days',
  },
];

function buildTimeRange(start: string, end: string): TimeRange {
  const timeStart = dateMath.parse(start)!;
  const timeEnd = dateMath.parse(end)!;
  return {
    start,
    end,
    isoStart: timeStart.toISOString(),
    isoEnd: timeEnd.toISOString(),
    unixStart: timeStart.utc().unix(),
    unixEnd: timeEnd.utc().unix(),
  };
}

type Props = Services;

function App({ fetchTopN, fetchElasticFlamechart }: Props) {
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

  const handleTimeChange = (selectedTime: { start: string; end: string; isInvalid: boolean }) => {
    if (selectedTime.isInvalid) {
      return;
    }

    const tr = buildTimeRange(selectedTime.start, selectedTime.end);
    setTimeRange(tr);
  };

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

  return (
    <EuiPage>
      <EuiPageBody paddingSize="none">
        <EuiPageHeader
          paddingSize="s"
          pageTitle="Continuous Profiling"
          rightSideItems={[
            <EuiSuperDatePicker
              start={timeRange.start}
              end={timeRange.end}
              isPaused={true}
              onTimeChange={handleTimeChange}
              commonlyUsedRanges={commonlyUsedRanges}
            />,
            <SettingsFlyout
              title={'Settings'}
              defaultIndex={index}
              updateIndex={updateIndex}
              defaultProjectID={projectID}
              updateProjectID={updateProjectID}
              defaultN={n}
              updateN={updateN}
            />,
          ]}
        />
        <EuiPageContent>
          <EuiPageContentBody paddingSize="none">
            <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} autoFocus="selected" />
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}

export const renderApp = (props: Props, element: AppMountParameters['element']) => {
  ReactDOM.render(<App {...props} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
