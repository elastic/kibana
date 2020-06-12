/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import {
  Chart,
  Settings,
  BarSeries,
  LineSeries,
  Axis,
  Position,
  DARK_THEME,
  LIGHT_THEME,
  niceTimeFormatter,
} from '@elastic/charts';
import { ThemeContext } from 'styled-components';
import numeral from '@elastic/numeral';
import { ChartContainer } from '../container';
import { data } from './mock.data';

export const APMChart = () => {
  const theme = useContext(ThemeContext);

  const transactionSeries = data.series.find((d) => d.key === 'transaction')!;
  const errorSeries = data.series.find((d) => d.key === 'error')!;

  const startAPM = transactionSeries.coordinates[0].x;
  const endAPM = transactionSeries.coordinates[transactionSeries.coordinates.length - 1].x;
  const formatterAPM = niceTimeFormatter([startAPM, endAPM]);

  return (
    <ChartContainer title={data.title}>
      <Chart>
        <Settings
          onBrushEnd={({ x }) => {
            console.log('#### APM', x);
          }}
          theme={theme.darkMode ? DARK_THEME : LIGHT_THEME}
          showLegend={true}
          legendPosition="bottom"
        />
        <BarSeries
          id="transactions"
          name="Transactions"
          data={transactionSeries.coordinates}
          xScaleType="time"
          xAccessor={'x'}
          yAccessors={['y']}
          color="blue"
          groupId="transactions"
        />
        <LineSeries
          id="errors"
          name="Errors"
          data={errorSeries.coordinates}
          xScaleType="time"
          xAccessor={'x'}
          yAccessors={['y']}
          color="gold"
          groupId="errors"
        />
        <Axis id="bottom-axis" position="bottom" tickFormat={formatterAPM} showGridLines />
        <Axis
          id="right"
          position={Position.Right}
          tickFormat={(d) => `${Number(d).toFixed(0)} %`}
          groupId="errors"
        />
        <Axis
          id="left-axis"
          position="left"
          showGridLines
          groupId="transactions"
          tickFormat={(d) => numeral(d).format('0a')}
        />
      </Chart>
    </ChartContainer>
  );
};
