/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AreaSeries, Axis, Chart, Position, ScaleType, Settings } from '@elastic/charts';
import { EuiPanel, EuiSkeletonText } from '@elastic/eui';
import type { SignificantEventsTimeline } from '@kbn/observability-utils-server/llm/service_rca/generate_timeline';
import moment from 'moment';
import React, { useMemo, useRef } from 'react';
import { useChartTheme } from '../../../hooks/use_chart_theme';
import { SignificantEventAnnotation } from './significant_event_annotation';
import { TIME_LINE_THEME } from './timeline_theme';

interface RootCauseAnalysisTimelineProps {
  start: number;
  end: number;
  timeline: SignificantEventsTimeline;
  loading: boolean;
}

const InnerRootCauseAnalysisTimeline = ({
  start,
  end,
  loading,
  timeline,
}: RootCauseAnalysisTimelineProps) => {
  const baseTheme = useChartTheme();

  const chartRef = useRef(null);

  const data = useMemo(() => {
    const points = [
      { x: moment(start).valueOf(), y: 0 },
      { x: moment(end).valueOf(), y: 0 },
    ];

    // adding 100 fake points to the chart so the chart shows cursor on hover
    for (let i = 0; i < 100; i++) {
      const diff = moment(end).valueOf() - moment(start).valueOf();
      points.push({ x: moment(start).valueOf() + (diff / 100) * i, y: 0 });
    }
    return points;
  }, [start, end]);

  if (loading) {
    return <EuiSkeletonText />;
  }

  const { events } = timeline;

  return (
    <>
      <Chart size={['100%', 100]} ref={chartRef}>
        <Settings
          xDomain={{
            min: moment(start).valueOf(),
            max: moment(end).valueOf(),
          }}
          theme={TIME_LINE_THEME}
          baseTheme={baseTheme.baseTheme}
          externalPointerEvents={{
            tooltip: { visible: true },
          }}
        />
        <Axis id="y" position={Position.Left} hide />
        <Axis
          id="x"
          position={Position.Bottom}
          tickFormat={(d) => moment(d).format('LTS')}
          style={{
            tickLine: {
              visible: true,
              strokeWidth: 1,
              stroke: '#98A2B3',
            },
          }}
        />

        {events.map((event, index) => {
          return <SignificantEventAnnotation event={{ ...event, id: String(index) }} />;
        })}

        <AreaSeries
          id="Time"
          xScaleType={ScaleType.Time}
          xAccessor="x"
          yAccessors={['y']}
          data={data}
          filterSeriesInTooltip={() => false}
        />
      </Chart>
    </>
  );
};

export function RootCauseAnalysisTimeline(props: RootCauseAnalysisTimelineProps) {
  return (
    <EuiPanel hasBorder>
      <InnerRootCauseAnalysisTimeline {...props} />
    </EuiPanel>
  );
}
