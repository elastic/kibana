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
  Settings,
  CustomSeriesColorsMap,
  DataSeriesColorsValues,
} from '@elastic/charts';
import '@elastic/charts/dist/style.css';
import { AreaChartData, WrappedByAutoSizer, ChartHolder, numberFormatter } from './common';
import { AutoSizer } from '../auto_sizer';

const getAreaSeriesStyle = (areaSeriesKey: string, color: string | undefined) => {
  if (!color) return undefined;
  const areaCustomSeriesColors: CustomSeriesColorsMap = new Map();
  const areaDataSeriesColorValues: DataSeriesColorsValues = {
    colorValues: [],
    specId: getSpecId(areaSeriesKey),
  };

  areaCustomSeriesColors.set(areaDataSeriesColorValues, color);

  return areaCustomSeriesColors;
};

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
        <Settings />
        {data.map((series, idx) => {
          const areaSeriesKey = series.key;
          const areaSeriesSpecId = getSpecId(areaSeriesKey);
          return series.value != null ? (
            <AreaSeries
              id={areaSeriesSpecId}
              key={areaSeriesKey}
              name={series.key.replace('Histogram', '')}
              data={series.value}
              xScaleType={ScaleType.Ordinal}
              yScaleType={ScaleType.Linear}
              xAccessor="x"
              yAccessors={['y']}
              customSeriesColors={getAreaSeriesStyle(areaSeriesKey, series.color)}
            />
          ) : null;
        })}

        <Axis
          id={getAxisId(`group-${data[0].key}-x`)}
          position={Position.Bottom}
          showOverlappingTicks={false}
          tickFormat={dateFormatter}
          tickSize={0}
        />
        <Axis
          id={getAxisId(`group-${data[0].key}-y`)}
          position={Position.Left}
          tickSize={0}
          tickFormat={numberFormatter}
        />
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
