/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getHumanReadableComparator } from './comparator_types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function renderIndexThresholdParams(params: any) {
  const agg = params.aggField ? `${params.aggType}(${params.aggField})` : `${params.aggType}`;
  const conditions = `${agg} is ${getHumanReadableComparator(
    params.thresholdComparator
  )} ${params.threshold.join(' and ')}`;
  const window = `${params.timeWindowSize}${params.timeWindowUnit}`;
  return `${conditions} over ${window}`;
}
