/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';

export type Unit = 'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'M' | 'y';

export const leastCommonInterval = (num = 0, base = 0) =>
  Math.max(Math.ceil(num / base) * base, base);

export const isCalendarInterval = ({ unit, value }: { unit: Unit; value: number }) => {
  const { unitsMap } = dateMath;
  return value === 1 && ['calendar', 'mixed'].includes(unitsMap[unit].type);
};
