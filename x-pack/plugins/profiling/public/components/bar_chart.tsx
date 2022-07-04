/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Axis, BarSeries, Chart, Settings } from '@elastic/charts';

import { timeFormatter } from '@elastic/charts';

export interface BarChartProps {
  id: string;
  name: string;
  height: number;
  data: any[];
  x: string;
  y: string;
}

export const BarChart: React.FC<BarChartProps> = ({ id, name, height, data, x, y }) => {
  return (
    <Chart size={{ height }}>
      <Settings showLegend={false} />
      <BarSeries id={id} name={name} data={data} xScaleType="time" xAccessor={x} yAccessors={[y]} />
      <Axis id="bottom-axis" position="bottom" tickFormat={timeFormatter('YYYY-MM-DD HH:mm:ss')} />
      <Axis id="left-axis" position="left" showGridLines tickFormat={(d) => Number(d).toFixed(0)} />
    </Chart>
  );
};
