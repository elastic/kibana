/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
type UnitFormat = 'days' | 'hours' | 'minutes' | 'seconds';

interface Duration {
  length: number;
  format: UnitFormat;
}

export const timeDuration = (time: number, format?: UnitFormat): Duration => {
  const seconds = time / 1000;
  const minutes = seconds / 60;
  const hours = minutes / 60;
  const days = hours / 24;

  if (format === 'days' || days >= 1) {
    return { length: days, format: 'days' };
  }
  if (format === 'hours' || hours >= 1) {
    return { length: hours, format: 'hours' };
  }
  if (format === 'minutes' || minutes >= 1) {
    return { length: seconds / 60, format: 'minutes' };
  }
  return { length: seconds, format: 'seconds' };
};
