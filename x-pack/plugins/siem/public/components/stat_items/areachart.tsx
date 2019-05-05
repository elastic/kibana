/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';
// @ts-ignore
import { EuiSeriesChart, EuiAreaSeries, EuiXAxis, EuiYAxis } from '@elastic/eui/lib/experimental';
import { AreaChartData, WrappedByAutoSizer, ChartHolder } from '.';
import { AutoSizer } from '../auto_sizer';

export const ChartBaseComponent = pure<{
  data: AreaChartData[];
  width: number | undefined;
  height: number | undefined;
}>(({ data, ...chartConfigs }) =>
  chartConfigs.width && chartConfigs.height ? (
    // @ts-ignore
    <SeriesChart {...chartConfigs} showDefaultAxis={false} xType="ordinal">
      {data.map(series =>
        series.value != null ? (
          /**
           * Placing ts-ignore here for fillOpacity
           * */
          // @ts-ignore
          <EuiAreaSeries
            key={`stat-items-areachart-${series.key}`}
            name={`stat-items-areachart-${series.key}`}
            // @ts-ignore
            data={series.value}
            fillOpacity={0.04}
            color={series.color}
          />
        ) : null
      )}
      {/*
// @ts-ignore */}
      <EuiXAxis tickFormat={timestamp => timestamp.split('T')[0]} />
      {/*
// @ts-ignore */}
      <EuiYAxis />
    </SeriesChart>
  ) : null
);

export const AreaChart = pure<{ areaChart: AreaChartData[] | [] | null | undefined }>(
  ({ areaChart }) => (
    <AutoSizer detectAnyWindowResize={false} content>
      {({ measureRef, content: { height, width } }) => (
        <WrappedByAutoSizer innerRef={measureRef}>
          {areaChart &&
          areaChart.length &&
          areaChart.every(({ value }) => value != null && value.length > 0) ? (
            <ChartBaseComponent height={height} width={width} data={areaChart} />
          ) : (
            <ChartHolder />
          )}
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
