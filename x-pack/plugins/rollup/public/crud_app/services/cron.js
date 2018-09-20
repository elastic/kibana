/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const MINUTE = 'MINUTE';
export const HOUR = 'HOUR';
export const DAY = 'DAY';
export const WEEK = 'WEEK';
export const MONTH = 'MONTH';
export const YEAR = 'YEAR';

export function cronExpressionToParts(expression) {
  const parsedCron = {
    minute: undefined,
    hour: undefined,
    day: undefined,
    date: undefined,
    month: undefined,
  };

  const parts = expression.split(' ');

  if (parts.length >= 1) {
    parsedCron.minute = parts[0];
  }

  if (parts.length >= 2) {
    parsedCron.hour = parts[1];
  }

  if (parts.length >= 3) {
    parsedCron.date = parts[2];
  }

  if (parts.length >= 4) {
    parsedCron.month = parts[3];
  }

  if (parts.length >= 5) {
    parsedCron.day = parts[4];
  }

  return parsedCron;
}

export function cronPartsToExpression({
  minute = '*',
  hour = '*',
  day = '*',
  date = '*',
  month = '*',
}) {
  return `${minute} ${hour} ${date} ${month} ${day}`;
}
