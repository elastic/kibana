/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { Coordinate } from '../../typings/timeseries';

export function offsetPreviousPeriodCoordinates({
  currentPeriodStart,
  previousPeriodTimeseries,
}: {
  currentPeriodStart?: number;
  previousPeriodTimeseries?: Coordinate[];
}) {
  if (!previousPeriodTimeseries?.length) {
    return [];
  }

  const dateOffset = moment(currentPeriodStart).diff(
    moment(previousPeriodTimeseries[0].x)
  );

  return previousPeriodTimeseries.map(({ x, y }) => {
    const offsetX = moment(x).add(dateOffset).valueOf();
    return {
      x: offsetX,
      y,
    };
  });
}
