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
import { clone as _clone } from 'lodash';
import { AreaChartData, WrappedByAutoSizer, ChartHolder } from '.';
import { AutoSizer } from '../auto_sizer';

const ChartBaseComponent = pure<{
  data: AreaChartData[];
  width: number | undefined;
  height: number | undefined;
}>(({ data, ...chartConfigs }) => {
  return chartConfigs.width &&
    chartConfigs.height &&
    data &&
    data.length &&
    data.every(({ value }) => value != null && value.length > 0) ? (
    <SeriesChart {...chartConfigs} showDefaultAxis={false} xType="ordinal">
      {data.map(series => {
        return (
          // @ts-ignore
          <EuiAreaSeries
            key={`stat-items-areachart-${series.key}`}
            name={series.key.replace('Histogram', '')}
            data={series.value!}
            fillOpacity={0.04}
            color={series.color}
          />
        );
      })}
      {/*
// @ts-ignore */}
      <EuiXAxis tickFormat={value => value.toString().split('T')[0]} />
      {/*
// @ts-ignore */}
      <EuiYAxis />
    </SeriesChart>
  ) : (
    <ChartHolder />
  );
});

export const AreaChart = pure<{ areaChart: AreaChartData[] }>(({ areaChart }) => (
  <AutoSizer detectAnyWindowResize={false} content>
    {({ measureRef, content: { height, width } }) => (
      <WrappedByAutoSizer data-test-subj="wrapped-by-auto-sizer" innerRef={measureRef}>
        <ChartBaseComponent height={height} width={width} data={areaChart} />
      </WrappedByAutoSizer>
    )}
  </AutoSizer>
));

// @ts-ignore
const SeriesChart = styled(EuiSeriesChart)`
  svg .rv-xy-plot__axis__ticks .rv-xy-plot__axis__tick:not(:first-child):not(:last-child) {
    display: none;
  }
`;
