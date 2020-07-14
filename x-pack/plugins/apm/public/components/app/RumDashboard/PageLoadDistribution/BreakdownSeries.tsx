/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect } from 'react';
import { CurveType, LineSeries, ScaleType } from '@elastic/charts';
import { PercentileRange } from './index';
import { useBreakdowns } from './use_breakdowns';

interface Props {
  field: string;
  value: string;
  percentileRange: PercentileRange;
  onLoadingChange: (loading: boolean) => void;
}

export const BreakdownSeries: FC<Props> = ({
  field,
  value,
  percentileRange,
  onLoadingChange,
}) => {
  const { data, status } = useBreakdowns({
    field,
    value,
    percentileRange,
  });

  useEffect(() => {
    onLoadingChange(status !== 'success');
  }, [status, onLoadingChange]);

  return (
    <>
      {data?.map(({ data: seriesData, name }) => (
        <LineSeries
          id={`${field}-${value}-${name}`}
          key={`${field}-${value}-${name}`}
          name={name}
          xScaleType={ScaleType.Linear}
          yScaleType={ScaleType.Linear}
          data={seriesData ?? []}
          curve={CurveType.CURVE_NATURAL}
        />
      ))}
    </>
  );
};
