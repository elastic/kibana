/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { LineSeries, getSpecId, ScaleType, CurveType } from '@elastic/charts';
import { getCustomColor, seriesStyle } from '../common/utils';

interface Props {
  lineChartData: any[];
}

const SPEC_ID = 'line';
const COLOR = '#006BB4';

const lineSeriesStyle = {
  ...seriesStyle,
};

export const Line: FC<Props> = ({ lineChartData }) => {
  return (
    <LineSeries
      id={getSpecId(SPEC_ID)}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor={'time'}
      yAccessors={['value']}
      data={lineChartData}
      yScaleToDataExtent={false}
      curve={CurveType.CURVE_MONOTONE_X}
      lineSeriesStyle={lineSeriesStyle}
      customSeriesColors={getCustomColor(SPEC_ID, COLOR)}
    />
  );
};
