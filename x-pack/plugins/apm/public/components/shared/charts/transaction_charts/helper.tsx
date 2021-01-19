/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isFiniteNumber } from '../../../../../common/utils/is_finite_number';
import { APMChartSpec, Coordinate } from '../../../../../typings/timeseries';
import { TimeFormatter } from '../../../../../common/utils/formatters';

export function getResponseTimeTickFormatter(formatter: TimeFormatter) {
  return (t: number) => formatter(t).formatted;
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
