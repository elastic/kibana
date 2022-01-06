/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Axis, BarSeries, Chart, Settings } from '@elastic/charts';
import { statusColors } from '../../../common/constants';
import { EvaluationResult } from '../../../../common/types';

// soon to be deprecated
export const ScorePerAccountChart = ({
  data: accountEvaluations,
}: {
  data: EvaluationResult[];
}) => {
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
        xAccessor={'resource'}
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
      fill: { color: 'white', borderColor: 'blue', borderWidth: 0 },
      offsetX: 5,
      offsetY: -5,
    },
  },
};
