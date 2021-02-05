/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Coordinate } from '../../typings/timeseries';

export function mergePeriodsTimeseries({
  currentPeriodTimeseries,
  previousPeriodTimeseries,
}: {
  currentPeriodTimeseries: Coordinate[];
  previousPeriodTimeseries?: Coordinate[];
}) {
  if (!currentPeriodTimeseries.length || !previousPeriodTimeseries?.length) {
    return [];
  }
  return currentPeriodTimeseries?.map(({ x, y }, index) => {
    const yComparison = previousPeriodTimeseries[index].y;
    return {
      x,
      y: yComparison,
    };
  });
}
