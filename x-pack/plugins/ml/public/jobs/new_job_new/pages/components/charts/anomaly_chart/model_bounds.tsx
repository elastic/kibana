/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { getSpecId, ScaleType, AreaSeries, CurveType } from '@elastic/charts';
import { ModelItem } from '../../../../common/results_loader';
import { getCustomColor, seriesStyle } from '../common/utils';

interface Props {
  modelData: ModelItem[];
}

const SPEC_ID = 'model';
const COLOR = '#006BB4';

const areaSeriesStyle = {
  ...seriesStyle,
  area: {
    fill: '',
    opacity: 0.25,
    visible: true,
  },
  line: {
    ...seriesStyle.line,
    strokeWidth: 1,
    opacity: 0.25,
  },
};

export const ModelBounds: FC<Props> = ({ modelData }) => {
  return (
    <AreaSeries
      id={getSpecId(SPEC_ID)}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor={'time'}
      yAccessors={['modelUpper']}
      y0Accessors={['modelLower']}
      data={modelData}
      stackAccessors={['time']}
      yScaleToDataExtent={false}
      curve={CurveType.CURVE_MONOTONE_X}
      areaSeriesStyle={areaSeriesStyle}
      customSeriesColors={getCustomColor(SPEC_ID, COLOR)}
    />
  );
};
