/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatten } from 'lodash';
import { TimeSeries } from '../../typings/timeseries';

export function getRangeFromTimeSeries(timeseries: TimeSeries[]) {
  const dataPoints = flatten(timeseries.map((series) => series.data));

  if (dataPoints.length) {
    return {
      start: dataPoints[0].x,
      end: dataPoints[dataPoints.length - 1].x,
    };
  }

  return null;
}
