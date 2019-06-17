/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { Chart, BarSeries, Axis, Position, getSpecId, ScaleType, Settings } from '@elastic/charts';
import { getAxisId } from '@elastic/charts';
import {
  ChartConfigsData,
  WrappedByAutoSizer,
  ChartHolder,
  numberFormatter,
  SeriesType,
  getSeriesStyle,
  getTheme,
} from './common';
import { AutoSizer } from '../auto_sizer';

// Bar chart rotation: https://ela.st/chart-rotations
export const BarChartBaseComponent = React.memo<{
  data: ChartConfigsData[];
  width: number | null | undefined;
  height: number | null | undefined;
}>(({ data, ...chartConfigs }) => {
  return chartConfigs.width && chartConfigs.height ? (
    <Chart>
      <Settings rotation={90} theme={getTheme()} />
      {data.map(series => {
        const barSeriesKey = series.key;
        const barSeriesSpecId = getSpecId(barSeriesKey);
        const seriesType = SeriesType.BAR;
        return (
          <BarSeries
            id={barSeriesSpecId}
            key={barSeriesKey}
            name={series.key}
            xScaleType={ScaleType.Ordinal}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={['y']}
            splitSeriesAccessors={['g']}
            data={series.value!}
            stackAccessors={['y']}
            customSeriesColors={getSeriesStyle(barSeriesKey, series.color, seriesType)}
          />
        );
      })}

      <Axis
        id={getAxisId(`stat-items-barchart-${data[0].key}-x`)}
        position={Position.Bottom}
        tickSize={0}
        tickFormat={numberFormatter}
      />
      <Axis
        id={getAxisId(`stat-items-barchart-${data[0].key}-y`)}
        position={Position.Left}
        tickSize={0}
      />
    </Chart>
  ) : null;
});

export const BarChartWithCustomPrompt = React.memo<{
  data: ChartConfigsData[] | null | undefined;
  height: number | null | undefined;
  width: number | null | undefined;
}>(({ data, height, width }) => {
  return data &&
    data.length &&
    data.some(
      ({ value }) =>
        value != null && value.length > 0 && value.every(chart => chart.y != null && chart.y > 0)
    ) ? (
    <BarChartBaseComponent height={height} width={width} data={data} />
  ) : (
    <ChartHolder />
  );
});

export const BarChart = React.memo<{ barChart: ChartConfigsData[] | null | undefined }>(
  ({ barChart }) => (
    <AutoSizer detectAnyWindowResize={false} content>
      {({ measureRef, content: { height, width } }) => (
        <WrappedByAutoSizer innerRef={measureRef}>
          <BarChartWithCustomPrompt height={height} width={width} data={barChart} />
        </WrappedByAutoSizer>
      )}
    </AutoSizer>
  )
);
