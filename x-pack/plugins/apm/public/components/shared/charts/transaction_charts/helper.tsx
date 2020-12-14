/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { TimeFormatter } from '../../../../../common/utils/formatters';
import { Coordinate, TimeSeries } from '../../../../../typings/timeseries';
import { isValidCoordinateValue } from '../../../../utils/isValidCoordinateValue';

export function getResponseTimeTickFormatter(formatter: TimeFormatter) {
  return (t: number) => {
    return formatter(t).formatted;
  };
}

export function getResponseTimeTooltipFormatter(formatter: TimeFormatter) {
  return (coordinate: Coordinate) => {
    return isValidCoordinateValue(coordinate.y)
      ? formatter(coordinate.y).formatted
      : NOT_AVAILABLE_LABEL;
  };
}

export function getMaxY(timeSeries?: Array<TimeSeries<Coordinate>>) {
  if (timeSeries) {
    const coordinates = timeSeries.flatMap((serie) => serie.data);
    const numbers = coordinates.map((c) => (c.y ? c.y : 0));
    return Math.max(...numbers, 0);
  }
  return 0;
}
