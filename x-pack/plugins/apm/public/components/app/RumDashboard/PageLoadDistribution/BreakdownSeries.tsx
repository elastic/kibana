/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CurveType, LineSeries, ScaleType } from '@elastic/charts';
import React, { useEffect } from 'react';
import { PercentileRange } from './index';
import { useBreakdowns } from './use_breakdowns';

interface Props {
  field: string;
  value: string;
  percentileRange: PercentileRange;
  onLoadingChange: (loading: boolean) => void;
}

export function BreakdownSeries({
  field,
  value,
  percentileRange,
  onLoadingChange,
}: Props) {
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
}
