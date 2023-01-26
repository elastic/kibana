/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Axis,
  BrushAxis,
  Chart,
  HistogramBarSeries,
  ScaleType,
  Settings,
  StackMode,
  timeFormatter,
  Tooltip,
  TooltipInfo,
  XYChartElementEvent,
} from '@elastic/charts';
import { EuiPanel } from '@elastic/eui';
import React from 'react';
import { TopNSample, TopNSubchart } from '../../common/topn';
import { useKibanaTimeZoneSetting } from '../hooks/use_kibana_timezone_setting';
import { useProfilingChartsTheme } from '../hooks/use_profiling_charts_theme';
import { asPercentage } from '../utils/formatters/as_percentage';
import { SubChart } from './subchart';

const SubchartTooltip = ({
  highlightedSubchart,
  highlightedSample,
  showFrames,
}: TooltipInfo & {
  highlightedSubchart: TopNSubchart;
  highlightedSample: TopNSample | null;
  showFrames: boolean;
}) => {
  // max tooltip width - 2 * padding (16px)
  const width = 224;
  return (
    <EuiPanel>
      <SubChart
        index={highlightedSubchart.Index}
        color={highlightedSubchart.Color}
        category={highlightedSubchart.Category}
        label={highlightedSubchart.Label}
        data={highlightedSubchart.Series}
        percentage={highlightedSubchart.Percentage}
        sample={highlightedSample}
        showFrames={showFrames}
        /* we don't show metadata in tooltips */
        metadata={[]}
        height={128}
        width={width}
        showAxes={false}
        onShowMoreClick={null}
        padTitle={false}
      />
    </EuiPanel>
  );
};

export interface StackedBarChartProps {
  height: number;
  asPercentages: boolean;
  onBrushEnd: (range: { rangeFrom: string; rangeTo: string }) => void;
  onSampleOver: (sample: TopNSample) => void;
  onSampleOut: () => void;
  highlightedSample: TopNSample | null;
  highlightedSubchart: TopNSubchart | null;
  charts: TopNSubchart[];
  showFrames: boolean;
}

export const StackedBarChart: React.FC<StackedBarChartProps> = ({
  height,
  asPercentages,
  onBrushEnd,
  onSampleOut,
  onSampleOver,
  highlightedSample,
  highlightedSubchart,
  charts,
  showFrames,
}) => {
  const timeZone = useKibanaTimeZoneSetting();

  const { chartsBaseTheme, chartsTheme } = useProfilingChartsTheme();

  const customTooltip = highlightedSubchart
    ? (props: TooltipInfo) => (
        <SubchartTooltip
          {...props}
          highlightedSubchart={highlightedSubchart!}
          highlightedSample={highlightedSample}
          showFrames={showFrames}
        />
      )
    : () => <></>;

  return (
    <Chart size={{ height }}>
      <Settings
        showLegend={false}
        brushAxis={BrushAxis.X}
        onBrushEnd={(brushEvent) => {
          const rangeFrom = new Date(brushEvent.x![0]).toISOString();
          const rangeTo = new Date(brushEvent.x![1]).toISOString();

          onBrushEnd({ rangeFrom, rangeTo });
        }}
        baseTheme={chartsBaseTheme}
        theme={chartsTheme}
        onElementOver={(events) => {
          const [value] = events[0] as XYChartElementEvent;
          onSampleOver(value.datum as TopNSample);
        }}
        onElementOut={() => {
          onSampleOut();
        }}
      />
      <Tooltip customTooltip={customTooltip} />
      {charts.map((chart) => (
        <HistogramBarSeries
          key={chart.Category}
          id={chart.Category}
          name={chart.Label}
          data={chart.Series}
          color={chart.Color}
          xAccessor={'Timestamp'}
          yAccessors={['Count']}
          stackMode={asPercentages ? StackMode.Percentage : undefined}
          xScaleType={ScaleType.Time}
          timeZone={timeZone}
        />
      ))}
      <Axis id="bottom-axis" position="bottom" tickFormat={timeFormatter('YYYY-MM-DD HH:mm:ss')} />
      <Axis
        id="left-axis"
        position="left"
        showGridLines
        tickFormat={(d) => (asPercentages ? asPercentage(d) : d.toFixed(0))}
      />
    </Chart>
  );
};
