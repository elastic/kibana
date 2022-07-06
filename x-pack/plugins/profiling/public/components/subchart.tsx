/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  AreaSeries,
  Axis,
  Chart,
  CurveType,
  ScaleType,
  Settings,
  timeFormatter,
} from '@elastic/charts';

import { CountPerTime } from '../../common/topn';

export interface SubChartProps {
  id: string;
  name: string;
  height: number;
  data: CountPerTime[];
  x: string;
  y: string;
}

export const SubChart: React.FC<SubChartProps> = ({ id, name, height, data, x, y }) => {
  return (
    <Chart size={{ height }}>
      <Settings showLegend={false} />
      <AreaSeries
        id={id}
        name={name}
        data={data}
        xAccessor={x}
        yAccessors={[y]}
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        areaSeriesStyle={{ area: { opacity: 0.3 }, line: { opacity: 1 } }}
        curve={CurveType.CURVE_STEP_AFTER}
      />
      <Axis id="bottom-axis" position="bottom" tickFormat={timeFormatter('YYYY-MM-DD HH:mm:ss')} />
      <Axis id="left-axis" position="left" showGridLines tickFormat={(d) => Number(d).toFixed(0)} />
    </Chart>
  );
};
