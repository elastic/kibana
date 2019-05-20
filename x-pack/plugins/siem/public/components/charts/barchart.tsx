/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { pure } from 'recompose';
import styled from 'styled-components';
import {
  Chart,
  BarSeries,
  Axis,
  Position,
  getSpecId,
  ScaleType,
  Settings,
  LIGHT_THEME,
  mergeWithDefaultTheme,
  PartialTheme,
  CustomSeriesColorsMap,
  DataSeriesColorsValues,
} from '@elastic/charts';
import { getAxisId } from '@elastic/charts';
import { BarChartData, WrappedByAutoSizer, ChartHolder, numberFormatter } from './common';
import { AutoSizer } from '../auto_sizer';

const getYTicks = (value: string | number) => {
  const label = value.toString();
  const labelLength = 4;
  return label.length > labelLength ? `${label.slice(0, labelLength)}.` : label;
};

const getTheme = () => {
  const theme: PartialTheme = {
    scales: {
      barsPadding: 0.5,
    },
  };
  return mergeWithDefaultTheme(theme);
};

const getBarSeriesStyle = (barSeriesKey: string, color: string | undefined) => {
  if (!color) return undefined;
  const barCustomSeriesColors: CustomSeriesColorsMap = new Map();
  const barDataSeriesColorValues: DataSeriesColorsValues = {
    colorValues: [barSeriesKey],
    specId: getSpecId(barSeriesKey),
  };

  barCustomSeriesColors.set(barDataSeriesColorValues, color);

  return barCustomSeriesColors;
};

export const BarChartBaseComponent = pure<{
  data: BarChartData[];
  width: number | null | undefined;
  height: number | null | undefined;
}>(({ data, ...chartConfigs }) => {
  return chartConfigs.width && chartConfigs.height ? (
    <Chart>
      <Settings rotation={90} theme={getTheme()} />
      {data.map(series => {
        const barSeriesKey = series.key;
        const barSeriesSpecId = getSpecId(barSeriesKey);
        return (
          <BarSeries
            id={barSeriesSpecId}
            key={barSeriesKey}
            name={series.key}
            xScaleType={ScaleType.Ordinal}
            yScaleType={ScaleType.Linear}
            xAccessor="y"
            yAccessors={['x']}
            splitSeriesAccessors={['g']}
            data={series.value!}
            customSeriesColors={getBarSeriesStyle(barSeriesKey, series.color)}
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
        tickFormat={getYTicks}
      />
    </Chart>
  ) : null;
});

export const BarChartWithCustomPrompt = pure<{
  data: BarChartData[] | null | undefined;
  height: number | null | undefined;
  width: number | null | undefined;
}>(({ data, height, width }) => {
  return data &&
    data.length &&
    data.some(
      ({ value }) =>
        value != null && value.length > 0 && value.every(chart => chart.x != null && chart.x > 0)
    ) ? (
    <BarChartBaseComponent height={height} width={width} data={data} />
  ) : (
    <ChartHolder />
  );
});

export const BarChart = pure<{ barChart: BarChartData[] | null | undefined }>(({ barChart }) => (
  <AutoSizer detectAnyWindowResize={false} content>
    {({ measureRef, content: { height, width } }) => (
      <WrappedByAutoSizer innerRef={measureRef}>
        <BarChartWithCustomPrompt height={height} width={width} data={barChart} />
      </WrappedByAutoSizer>
    )}
  </AutoSizer>
));

// const SeriesChart = styled(EuiSeriesChart)`
//   svg
//     .rv-xy-plot__axis--horizontal
//     .rv-xy-plot__axis__ticks
//     .rv-xy-plot__axis__tick:not(:first-child):not(:last-child) {
//     display: none;
//   }
// `;
