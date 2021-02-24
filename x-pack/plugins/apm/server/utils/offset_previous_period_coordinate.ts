/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { Coordinate } from '../../typings/timeseries';

function getDateDiff({ start, end }: { start: number; end: number }) {
  return moment(start).diff(moment(end));
}

export function offsetXCoordinate({
  currentPeriodStart,
  previousPeriodStart,
  x,
}: {
  currentPeriodStart: number;
  previousPeriodStart: number;
  x: number;
}) {
  const dateOffset = getDateDiff({
    start: currentPeriodStart,
    end: previousPeriodStart,
  });
  return moment(x).add(dateOffset).valueOf();
}

export function offsetPreviousPeriodCoordinates({
  currentPeriodStart,
  previousPeriodStart,
  previousPeriodTimeseries,
}: {
  currentPeriodStart: number;
  previousPeriodStart: number;
  previousPeriodTimeseries?: Coordinate[];
}) {
  if (!previousPeriodTimeseries) {
    return [];
  }

  const dateOffset = getDateDiff({
    start: currentPeriodStart,
    end: previousPeriodStart,
  });

  return previousPeriodTimeseries.map(({ x, y }) => {
    const offsetX = moment(x).add(dateOffset).valueOf();
    return {
      x: offsetX,
      y,
    };
  });
}
