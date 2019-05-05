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
// @ts-ignore
import { EuiSeriesChart, EuiBarSeries, EuiXAxis, EuiYAxis } from '@elastic/eui/lib/experimental';
import { BarChartData, WrappedByAutoSizer, ChartHolder } from '.';
import { AutoSizer } from '../auto_sizer';

const { SCALE, ORIENTATION } = EuiSeriesChartUtils;
const getYaxis = (value: string | number) => {
  const label = value.toString();
  return label.length > 4 ? `${label.slice(0, 4)}.` : label;
};

const ChartBaseComponent = pure<{
  data: BarChartData[];
  width: number | undefined;
  height: number | undefined;
}>(({ data, ...chartConfigs }) => {
  return chartConfigs.width && chartConfigs.height ? (
    // @ts-ignore
    <SeriesChart
      yType={SCALE.ORDINAL}
      orientation={ORIENTATION.HORIZONTAL}
      showDefaultAxis={false}
      {...chartConfigs}
    >
      {data.map(series => {
        return (
          // @ts-ignore
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

export const BarChart = pure<{ barChart: BarChartData[] | [] | null | undefined }>(
  ({ barChart }) => (
    <AutoSizer detectAnyWindowResize={false} content>
      {({ measureRef, content: { height, width } }) => (
        <WrappedByAutoSizer innerRef={measureRef}>
          {barChart &&
          barChart.length &&
          barChart.every(
            ({ value }) => value != null && value.length > 0 && value.some(({ x }) => x != null)
          ) ? (
            <ChartBaseComponent height={height} width={width} data={barChart} />
          ) : (
            <ChartHolder />
          )}
        </WrappedByAutoSizer>
      )}
    </AutoSizer>
  )
);

// @ts-ignore
const SeriesChart = styled(EuiSeriesChart)`
  svg
    .rv-xy-plot__axis--horizontal
    .rv-xy-plot__axis__ticks
    .rv-xy-plot__axis__tick:not(:first-child):not(:last-child) {
    display: none;
  }
`;
