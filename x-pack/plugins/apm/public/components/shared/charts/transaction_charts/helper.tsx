/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Coordinate, TimeSeries } from '../../../../../typings/timeseries';
import { TimeFormatter } from '../../../../../common/utils/formatters';

export function getResponseTimeTickFormatter(formatter: TimeFormatter) {
  return (t: number) => formatter(t).formatted;
}

export function getMaxY(timeSeries?: Array<TimeSeries<Coordinate>>) {
  if (timeSeries) {
    const coordinates = timeSeries.flatMap((serie) => serie.data);
    const numbers = coordinates.map((c) => (c.y ? c.y : 0));
    return Math.max(...numbers, 0);
  }
  return 0;
}
