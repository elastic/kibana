/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Axis, BarSeries, Chart, Position, ScaleType, Settings, Tooltip } from '@elastic/charts';
import React from 'react';
import { NoChartsData } from './no_charts_data';
import { ComparisonHistogram } from '../types';
import { DataComparisonChartTooltipBody } from '../data_comparison_chart_tooltip_body';
import { COMPARISON_LABEL, DATA_COMPARISON_TYPE } from '../constants';

export const DataComparisonDistributionChart = ({
  featureName,
  fieldType,
  data,
  colors,
}: {
  featureName: string;
  fieldType: string;
  data: ComparisonHistogram[];
  colors: { referenceColor: string; productionColor: string };
}) => {
  if (data.length === 0) return <NoChartsData />;
  return (
    <Chart>
      <Tooltip body={DataComparisonChartTooltipBody} />
      <Settings />
      <Axis id="bottom" position={Position.Bottom} />
      <Axis id="left2" position={Position.Left} tickFormat={(d: any) => Number(d).toFixed(2)} />
      <BarSeries
        id="data-drift-viz"
        name={featureName}
        xScaleType={
          fieldType === DATA_COMPARISON_TYPE.NUMERIC ? ScaleType.Linear : ScaleType.Ordinal
        }
        yScaleType={ScaleType.Linear}
        xAccessor="key"
        yAccessors={['percentage']}
        splitSeriesAccessors={['g']}
        data={data}
        color={(identifier) => {
          const key = identifier.seriesKeys[0];
          return key === COMPARISON_LABEL ? colors.productionColor : colors.referenceColor;
        }}
      />
    </Chart>
  );
};
