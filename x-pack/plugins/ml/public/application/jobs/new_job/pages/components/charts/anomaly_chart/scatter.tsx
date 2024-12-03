/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import type { LineSeriesStyle, RecursivePartial } from '@elastic/charts';
import { LineSeries, ScaleType, CurveType } from '@elastic/charts';
import { lineSeriesStyle, useChartColors } from '../common/settings';

interface Props {
  chartData: any[];
}

const SPEC_ID = 'scatter';

const scatterSeriesStyle: RecursivePartial<LineSeriesStyle> = {
  ...lineSeriesStyle,
  line: {
    ...lineSeriesStyle.line,
    visible: false,
  },
  point: {
    ...lineSeriesStyle.point,
    visible: 'always',
  },
};

export const Scatter: FC<Props> = ({ chartData }) => {
  const { LINE_COLOR } = useChartColors();
  return (
    <LineSeries
      id={SPEC_ID}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor={'time'}
      yAccessors={['value']}
      data={chartData}
      curve={CurveType.CURVE_MONOTONE_X}
      lineSeriesStyle={scatterSeriesStyle}
      color={LINE_COLOR}
    />
  );
};
