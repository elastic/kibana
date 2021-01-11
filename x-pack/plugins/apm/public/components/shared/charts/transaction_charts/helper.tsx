/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isFiniteNumber } from '../../../../../common/utils/is_finite_number';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { TimeFormatter } from '../../../../../common/utils/formatters';
import { APMChartSpec, Coordinate } from '../../../../../typings/timeseries';
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

export function getMaxY(specs?: Array<APMChartSpec<Coordinate>>) {
  const values = specs
    ?.flatMap((spec) => spec.data)
    .map((coord) => coord.y)
    .filter(isFiniteNumber);

  if (values?.length) {
    return Math.max(...values, 0);
  }
  return 0;
}
