/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';
import { EuiSeriesChart, EuiAreaSeries } from '@elastic/eui/lib/experimental';
import { AreaChartData, WrappedByAutoSizer } from '.';
import { AutoSizer } from '../auto_sizer';

const ChartBaseComponent = pure<{
  data: AreaChartData[];
  width: number | undefined;
  height: number | undefined;
}>(({ data, ...chartConfigs }) =>
  chartConfigs.width && chartConfigs.height ? (
    <SeriesChart {...chartConfigs}>
      {data.map(series =>
        series.value != null ? (
          /**
           * Placing ts-ignore here for fillOpacity
           * */
          // @ts-ignore
          <EuiAreaSeries
            key={`stat-items-areachart-${series.key}`}
            name={`stat-items-areachart-${series.key}`}
            data={series.value}
            fillOpacity={0.04}
            color={series.color}
          />
        ) : null
      )}
    </SeriesChart>
  ) : null
);

export const AreaChart = pure<{ areaChart: AreaChartData[] }>(({ areaChart }) => (
  <AutoSizer detectAnyWindowResize={false} content>
    {({ measureRef, content: { height, width } }) => (
      <WrappedByAutoSizer data-test-subj="wrapped-by-auto-sizer" innerRef={measureRef}>
        <ChartBaseComponent height={height} width={width} data={areaChart} />
      </WrappedByAutoSizer>
    )}
  </AutoSizer>
));

const SeriesChart = styled(EuiSeriesChart)`
  svg .rv-xy-plot__axis__ticks .rv-xy-plot__axis__tick:not(:first-child):not(:last-child) {
    display: none;
  }
`;
