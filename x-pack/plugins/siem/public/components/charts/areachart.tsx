/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { pure } from 'recompose';
import {
  Chart,
  Axis,
  AreaSeries,
  ScaleType,
  Position,
  getAxisId,
  getSpecId,
} from '@elastic/charts';
import '@elastic/charts/dist/style.css';
import { AreaChartData, WrappedByAutoSizer, ChartHolder } from './common';
import { AutoSizer } from '../auto_sizer';

const seriesAreaStyle = (color: string) => ({
  area: {
    fill: color,
    visible: true,
    opacity: 0.4,
  },
  line: {
    stroke: color,
    strokeWidth: 1,
    visible: true,
  },
  border: {
    visible: false,
    strokeWidth: 1,
    stroke: color,
  },
  point: {
    visible: false,
    radius: 0.2,
    stroke: color,
    strokeWidth: 1,
    opacity: 1,
  },
});

const dateFormatter = (d: string) => {
  return d.toLocaleString().split('T')[0];
};

export const AreaChartBaseComponent = pure<{
  data: AreaChartData[];
  width: number | null | undefined;
  height: number | null | undefined;
}>(({ data, ...chartConfigs }) => {
  return chartConfigs.width && chartConfigs.height ? (
    <div style={{ height: chartConfigs.height, width: chartConfigs.width, position: 'relative' }}>
      <Chart>
        {data.map((series, idx) =>
          series.value != null ? (
            <AreaSeries
              id={getSpecId(`area-${series.key}-${idx}`)}
              key={`stat-items-areachart-${series.key}`}
              name={series.key.replace('Histogram', '')}
              data={series.value}
              xScaleType={ScaleType.Ordinal}
              yScaleType={ScaleType.Linear}
              xAccessor="x"
              yAccessors={['y']}
              areaSeriesStyle={series.color ? seriesAreaStyle(series.color) : undefined}
            />
          ) : null
        )}

        <Axis
          id={getAxisId(`group-${data[0].key}-x`)}
          position={Position.Bottom}
          showOverlappingTicks={false}
          tickFormat={dateFormatter}
          tickSize={0}
        />
        <Axis id={getAxisId(`group-${data[0].key}-y`)} position={Position.Left} tickSize={0} />
      </Chart>
    </div>
  ) : null;
});

export const AreaChartWithCustomPrompt = pure<{
  data: AreaChartData[] | null | undefined;
  height: number | null | undefined;
  width: number | null | undefined;
}>(({ data, height, width }) => {
  return data != null &&
    data.length &&
    data.every(
      ({ value }) =>
        value != null &&
        value.length > 0 &&
        value.every(chart => chart.x != null && chart.y != null)
    ) ? (
    <AreaChartBaseComponent height={height} width={width} data={data} />
  ) : (
    <ChartHolder />
  );
});

export const AreaChart = pure<{ areaChart: AreaChartData[] | null | undefined }>(
  ({ areaChart }) => (
    <AutoSizer detectAnyWindowResize={false} content>
      {({ measureRef, content: { height, width } }) => (
        <WrappedByAutoSizer innerRef={measureRef}>
          <AreaChartWithCustomPrompt data={areaChart} height={height} width={width} />
        </WrappedByAutoSizer>
      )}
    </AutoSizer>
  )
);
