/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { LineSeries, ScaleType, CurveType } from '@elastic/charts';
import { seriesStyle, useChartColors } from '../common/settings';

interface Props {
  chartData: any[];
}

const SPEC_ID = 'scatter';

const scatterSeriesStyle = {
  ...seriesStyle,
  line: {
    ...seriesStyle.line,
    visible: false,
  },
  point: {
    ...seriesStyle.point,
    visible: true,
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
      yScaleToDataExtent={false}
      curve={CurveType.CURVE_MONOTONE_X}
      lineSeriesStyle={scatterSeriesStyle}
      customSeriesColors={[LINE_COLOR]}
    />
  );
};
