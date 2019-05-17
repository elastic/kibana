/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  // @ts-ignore
  EuiSeriesChartUtils,
} from '@elastic/eui';
import { pure } from 'recompose';
import styled from 'styled-components';
import { EuiSeriesChart, EuiBarSeries, EuiXAxis, EuiYAxis } from '@elastic/eui/lib/experimental';
import { BarChartData, WrappedByAutoSizer, ChartHolder } from '.';
import { AutoSizer } from '../auto_sizer';

const { SCALE, ORIENTATION } = EuiSeriesChartUtils;
const getYaxis = (value: string | number) => {
  const label = value.toString();
  const labelLength = 4;
  return label.length > labelLength ? `${label.slice(0, labelLength)}.` : label;
};

export const BarChartBaseComponent = pure<{
  data: BarChartData[];
  width: number | null | undefined;
  height: number | null | undefined;
}>(({ data, ...chartConfigs }) => {
  return chartConfigs.width && chartConfigs.height ? (
    // @ts-ignore
    <SeriesChart
      yType={SCALE.ORDINAL}
      orientation={ORIENTATION.HORIZONTAL}
      showDefaultAxis={false}
      data-test-subj="stat-bar-chart"
      {...chartConfigs}
    >
      {data.map(series => {
        return (
          <EuiBarSeries
            key={`stat-items-areachart-${series.key}`}
            name={series.key}
            // @ts-ignore
            data={series.value!}
            color={series.color}
          />
        );
      })}
      {/*
// @ts-ignore */}
      <EuiXAxis />
      {/*
// @ts-ignore */}
      <EuiYAxis tickFormat={getYaxis} />
    </SeriesChart>
  ) : null;
});

export const BarChartWithCustomPrompt = pure<{
  data: BarChartData[] | null | undefined;
  height: number | null | undefined;
  width: number | null | undefined;
}>(({ data, height, width }) => {
  return data &&
    data.length &&
    data.every(
      ({ value }) => value != null && value.length > 0 && value.every(chart => chart.x != null)
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

const SeriesChart = styled(EuiSeriesChart)`
  svg
    .rv-xy-plot__axis--horizontal
    .rv-xy-plot__axis__ticks
    .rv-xy-plot__axis__tick:not(:first-child):not(:last-child) {
    display: none;
  }
`;
