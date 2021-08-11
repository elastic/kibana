/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { Coordinate } from '../../typings/timeseries';

export function offsetPreviousPeriodCoordinates({
  currentPeriodTimeseries,
  previousPeriodTimeseries,
}: {
  currentPeriodTimeseries?: Coordinate[];
  previousPeriodTimeseries?: Coordinate[];
}) {
  if (!previousPeriodTimeseries?.length) {
    return [];
  }
  const currentPeriodStart = currentPeriodTimeseries?.[0].x ?? 0;
  const dateDiff = currentPeriodStart - previousPeriodTimeseries[0].x;

  return previousPeriodTimeseries.map(({ x, y }) => {
    const offsetX = moment(x).add(dateDiff).valueOf();
    return {
      x: offsetX,
      y,
    };
  });
}
