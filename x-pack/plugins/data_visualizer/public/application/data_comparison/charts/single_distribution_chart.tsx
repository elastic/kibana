/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SeriesColorAccessor } from '@elastic/charts/dist/chart_types/xy_chart/utils/specs';
import { BarSeries, Chart, ScaleType, Settings } from '@elastic/charts';
import React from 'react';
import { NoChartsData } from './no_charts_data';
import { DATA_COMPARISON_TYPE } from '../constants';
import { DataComparisonField, Histogram } from '../types';

export const SingleDistributionChart = ({
  data,
  color,
  fieldType,
  name,
}: {
  data: Histogram[];
  name: string;
  color?: SeriesColorAccessor;
  fieldType?: DataComparisonField['type'];
}) => {
  if (data.length === 0) return <NoChartsData textAlign="left" />;

  return (
    <Chart>
      <Settings />
      <BarSeries
        id={`${name}-distr-viz`}
        name={name}
        xScaleType={
          fieldType === DATA_COMPARISON_TYPE.NUMERIC ? ScaleType.Linear : ScaleType.Ordinal
        }
        yScaleType={ScaleType.Linear}
        xAccessor="key"
        yAccessors={['percentage']}
        data={data}
        color={color}
      />
    </Chart>
  );
};
