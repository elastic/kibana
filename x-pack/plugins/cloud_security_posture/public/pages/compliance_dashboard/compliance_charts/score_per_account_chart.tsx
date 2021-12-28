/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Axis, BarSeries, Chart, Settings } from '@elastic/charts';
import { statusColors } from '../../../common/constants';

const mockData = [
  { id: '1', name: 'e836f61f0', value: 303, evaluation: 'pass' },
  { id: '2', name: 'e836f61f0', value: 204, evaluation: 'fail' },
  { id: '3', name: 'f0e26fd4d', value: 180, evaluation: 'pass' },
  { id: '4', name: 'f0e26fd4d', value: 200, evaluation: 'fail' },
  { id: '5', name: '4553458ce', value: 150, evaluation: 'pass' },
  { id: '6', name: '4553458ce', value: 130, evaluation: 'fail' },
  { id: '7', name: '7f6535170', value: 550, evaluation: 'pass' },
  { id: '8', name: '7f6535170', value: 230, evaluation: 'fail' },
  { id: '9', name: 'f04f0fa90', value: 130, evaluation: 'pass' },
  { id: '10', name: 'f04f0fa90', value: 130, evaluation: 'fail' },
];

export const ScorePerAccountChart = ({ data: accountEvaluations = mockData }) => {
  return (
    <Chart size={{ height: 200 }}>
      <Settings theme={theme} rotation={90} showLegend={false} />
      <Axis id="left" position="left" />
      <BarSeries
        displayValueSettings={{
          showValueLabel: true,
          valueFormatter: (v) => `${Number(v * 100).toFixed(0)}%`,
        }}
        id="bars"
        name="0"
        data={accountEvaluations}
        xAccessor={'name'}
        yAccessors={['value']}
        splitSeriesAccessors={['evaluation']}
        stackAccessors={['evaluation']}
        stackMode="percentage"
      />
    </Chart>
  );
};

const theme = {
  colors: { vizColors: [statusColors.success, statusColors.danger] },
  barSeriesStyle: {
    displayValue: {
      fontSize: 14,
      fontFamily: "'Open Sans', Helvetica, Arial, sans-serif",
      fill: { color: 'white', borderColor: 'blue', borderWidth: 0 },
      offsetX: 5,
      offsetY: -5,
    },
  },
};
