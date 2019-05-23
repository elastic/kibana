/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CHART_FORMAT_LIMITS } from '../../../../common/constants';

const { FOUR_DAYS, FOUR_MINUTES, FOUR_YEARS, HOUR, THIRTY_SIX_HOURS, WEEK } = CHART_FORMAT_LIMITS;

const array: Array<{ key: number; value: string }> = [
  {
    key: FOUR_MINUTES,
    value: 'HH:mm:ss',
  },
  {
    key: HOUR,
    value: 'HH:mm',
  },
  {
    key: THIRTY_SIX_HOURS,
    value: 'HH:mm',
  },
  {
    key: FOUR_DAYS,
    value: 'MM-dd HH:mm',
  },
  {
    key: WEEK,
    value: 'MM-dd',
  },
  {
    key: FOUR_YEARS,
    value: 'YYYY-MM',
  },
];

/**
 * Returns an appropriate label format bbased on pre-defined intervals.
 * @param delta The length of the timespan in milliseconds
 */
export const getLabelFormat = (delta: number): string => {
  for (let index = 0; index < array.length; index += 1) {
    const { key, value } = array[index];
    if (delta < key) {
      return value;
    }
  }
  return 'YYYY';
};
