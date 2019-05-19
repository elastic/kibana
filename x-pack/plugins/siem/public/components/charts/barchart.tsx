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

const getYaxis = (value: string | number) => {
  const label = value.toString();
  const labelLength = 4;
  return label.length > labelLength ? `${label.slice(0, labelLength)}.` : label;
};

const euiColorVis0 = '#00B3A4';
const euiColorVis1 = '#3185FC';
const euiColorVis2 = '#DB1374';
const euiColorVis3 = '#490092';
const euiColorVis9 = '#920000';

const seriesBarStyle = () => {
  const theme: PartialTheme = {
    sharedStyle: {
      default: {
        opacity: 0.4,
      },
    },
    scales: {
      barsPadding: 0.55,
    },
  };
  return mergeWithDefaultTheme(theme, LIGHT_THEME);
};

const barCustomSeriesColors: CustomSeriesColorsMap = new Map();
const barDataSeriesColorValues: DataSeriesColorsValues = {
  colorValues: ['stat-items-barchart-authSuccess'],
  specId: getSpecId('stat-items-barchart-authSuccess'),
};

barCustomSeriesColors.set(barDataSeriesColorValues, '#000');
export const BarChartBaseComponent = pure<{
  data: BarChartData[];
  width: number | null | undefined;
  height: number | null | undefined;
}>(({ data, ...chartConfigs }) => {
  return chartConfigs.width && chartConfigs.height ? (
    <Chart>
      <Settings rotation={90} theme={seriesBarStyle()} />
      {data.map(series => {
        return (
          <BarSeries
            id={getSpecId(`stat-items-barchart-${series.key}`)}
            key={`stat-items-barchart-${series.key}`}
            name={series.key}
            xScaleType={ScaleType.Ordinal}
            yScaleType={ScaleType.Linear}
            xAccessor="y"
            yAccessors={['x']}
            data={series.value!}
            customSeriesColors={barCustomSeriesColors}
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
        tickFormat={getYaxis}
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
