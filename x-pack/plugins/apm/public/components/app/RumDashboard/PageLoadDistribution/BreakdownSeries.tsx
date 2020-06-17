/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { CurveType, LineSeries, ScaleType } from '@elastic/charts';
import { usePageLoadBreakdowns } from './use_breakdowns';
import { PercentileR } from './index';

interface Props {
  field: string;
  value: string;
  percentileRange: PercentileR;
}

export const BreakdownSeries: FC<Props> = ({
  field,
  value,
  percentileRange,
}) => {
  const { data } = usePageLoadBreakdowns({
    field,
    value,
    percentileRange,
  });

  return (
    <LineSeries
      id={`${field}-${value}`}
      name={value}
      xScaleType={ScaleType.Linear}
      yScaleType={ScaleType.Linear}
      data={data?.pageLoadDistribution ?? []}
      curve={CurveType.CURVE_NATURAL}
    />
  );
};
