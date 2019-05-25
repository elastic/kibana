/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';
import { EuiSeriesChart, EuiAreaSeries, EuiXAxis, EuiYAxis } from '@elastic/eui/lib/experimental';
import { AreaChartData, WrappedByAutoSizer, ChartHolder } from '.';
import { AutoSizer } from '../auto_sizer';

export const AreaChartBaseComponent = pure<{
  data: AreaChartData[];
  width: number | null | undefined;
  height: number | null | undefined;
}>(({ data, ...chartConfigs }) =>
  chartConfigs.width && chartConfigs.height ? (
    <SeriesChart
      {...chartConfigs}
      showDefaultAxis={false}
      xType="ordinal"
      data-test-subj="stat-area-chart"
    >
      {data.map(series => (
        /**
         * Placing ts-ignore here for fillOpacity
         * */
        // @ts-ignore
        <EuiAreaSeries
          key={`stat-items-areachart-${series.key}`}
          name={series.key.replace('Histogram', '')}
          // @ts-ignore
          data={series.value}
          fillOpacity={0.04}
          color={series.color}
        />
      ))}
      {/*
// @ts-ignore */}
      <EuiXAxis tickFormat={timestamp => timestamp.split('T')[0]} />
      {/*
// @ts-ignore */}
      <EuiYAxis />
    </SeriesChart>
  ) : null
);

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

const SeriesChart = styled(EuiSeriesChart)`
  svg .rv-xy-plot__axis__ticks .rv-xy-plot__axis__tick:not(:first-child):not(:last-child) {
    display: none;
  }
`;
