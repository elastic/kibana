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
  XYChartElementEvent,
  TooltipInfo,
} from '@elastic/charts';
import { EuiPanel } from '@elastic/eui';
import { keyBy } from 'lodash';
import React, { useMemo, useState } from 'react';
import { TopNSample, TopNSubchart } from '../../common/topn';
import { useKibanaTimeZoneSetting } from '../hooks/use_kibana_timezone_setting';
import { useProfilingChartsTheme } from '../hooks/use_profiling_charts_theme';
import { asPercentage } from '../utils/formatters/as_percentage';
import { SubChart } from './subchart';

// 2 * padding (16px)
const MAX_TOOLTIP_WIDTH = 224;

export interface StackedBarChartProps {
  height: number;
  asPercentages: boolean;
  onBrushEnd: (range: { rangeFrom: string; rangeTo: string }) => void;
  charts: TopNSubchart[];
  showFrames: boolean;
}

export const StackedBarChart: React.FC<StackedBarChartProps> = ({
  height,
  asPercentages,
  onBrushEnd,
  charts,
  showFrames,
}) => {
  const chartsbyCategoryMap = useMemo(() => {
    return keyBy(charts, 'Category');
  }, [charts]);

  const timeZone = useKibanaTimeZoneSetting();
  const [highlightedSample, setHighlightedSample] = useState<TopNSample | undefined>();

  const { chartsBaseTheme, chartsTheme } = useProfilingChartsTheme();

  function CustomTooltipWithSubChart(props: TooltipInfo) {
    if (!highlightedSample) {
      return null;
    }
    const highlightedSubchart = chartsbyCategoryMap[highlightedSample.Category];

    if (!highlightedSubchart) {
      return null;
    }

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
          width={MAX_TOOLTIP_WIDTH}
          showAxes={false}
          onShowMoreClick={null}
          padTitle={false}
        />
      </EuiPanel>
    );
  }

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
          setHighlightedSample(value.datum as TopNSample);
        }}
        onElementOut={() => {
          setHighlightedSample(undefined);
        }}
      />
      <Tooltip customTooltip={CustomTooltipWithSubChart} />
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
