/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten } from 'lodash';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { isValidCoordinateValue } from '../../../../utils/isValidCoordinateValue';
import { TimeSeries, Coordinate } from '../../../../../typings/timeseries';
import { TimeFormatter } from '../../../../utils/formatters';

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

export function getMaxY(timeSeries: TimeSeries[]) {
  const coordinates = flatten(
    timeSeries.map((serie: TimeSeries) => serie.data as Coordinate[])
  );

  const numbers: number[] = coordinates.map((c: Coordinate) => (c.y ? c.y : 0));

  return Math.max(...numbers, 0);
}
