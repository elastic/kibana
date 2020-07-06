/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten } from 'lodash';
import { TimeSeries } from '../../typings/timeseries';

export const getRangeFromTimeSeries = (timeseries: TimeSeries[]) => {
  const dataPoints = flatten(timeseries.map((series) => series.data));

  if (dataPoints.length) {
    return {
      start: dataPoints[0].x,
      end: dataPoints[dataPoints.length - 1].x,
    };
  }

  return null;
};
