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
import { EuiSeriesChart, EuiBarSeries } from '@elastic/eui/lib/experimental';
import { BarChartData, WrappedByAutoSizer } from '.';
import { AutoSizer } from '../auto_sizer';

const { SCALE, ORIENTATION } = EuiSeriesChartUtils;

const ChartBaseComponent = pure<{
  data: BarChartData[];
  width: number | undefined;
  height: number | undefined;
}>(({ data, ...chartConfigs }) =>
  chartConfigs.width &&
  chartConfigs.height &&
  data.every(({ value }) => value != null && value.length > 0) ? (
    <SeriesChart yType={SCALE.ORDINAL} orientation={ORIENTATION.HORIZONTAL} {...chartConfigs}>
      {data.map(series =>
        series.value != null ? (
          /**
           * Placing ts-ignore here for fillOpacity
           * */
          // @ts-ignore
          <EuiBarSeries
            key={`stat-items-areachart-${series.key}`}
            name={`stat-items-areachart-${series.key}`}
            data={series.value}
            color={series.color}
          />
        ) : null
      )}
    </SeriesChart>
  ) : null
);

export const BarChart = pure<{ barChart: BarChartData[] }>(({ barChart }) => (
  <AutoSizer detectAnyWindowResize={false} content>
    {({ measureRef, content: { height, width } }) => (
      <WrappedByAutoSizer data-test-subj="wrapped-by-auto-sizer" innerRef={measureRef}>
        <ChartBaseComponent height={height} width={width} data={barChart} />
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
