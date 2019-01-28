/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const getLabel = (label, val) => (val > 1 || val === 0 ? `${label}s` : label);

export const timeDuration = (time, format) => {
  const seconds = time / 1000;
  const minutes = seconds / 60;
  const hours = minutes / 60;
  const days = hours / 24;

  if (format === 'days' || days >= 1) {
    return { length: days, format: getLabel('day', days) };
  }
  if (format === 'hours' || hours >= 1) {
    return { length: hours, format: getLabel('hour', hours) };
  }
  if (format === 'minutes' || minutes >= 1) {
    return { length: seconds / 60, format: getLabel('minute', minutes) };
  }
  return { length: seconds, format: getLabel('second', seconds) };
};

export const timeDurationString = (time, format) => {
  const { length, format: fmt } = timeDuration(time, format);
  return `${length} ${fmt}`;
};
