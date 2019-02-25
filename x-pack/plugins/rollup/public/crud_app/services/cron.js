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
    second: undefined,
    minute: undefined,
    hour: undefined,
    day: undefined,
    date: undefined,
    month: undefined,
  };

  const parts = expression.split(' ');

  if (parts.length >= 1) {
    parsedCron.second = parts[0];
  }

  if (parts.length >= 2) {
    parsedCron.minute = parts[1];
  }

  if (parts.length >= 3) {
    parsedCron.hour = parts[2];
  }

  if (parts.length >= 4) {
    parsedCron.date = parts[3];
  }

  if (parts.length >= 5) {
    parsedCron.month = parts[4];
  }

  if (parts.length >= 6) {
    parsedCron.day = parts[5];
  }

  return parsedCron;
}

export function cronPartsToExpression({
  second,
  minute,
  hour,
  day,
  date,
  month,
}) {
  return `${second} ${minute} ${hour} ${date} ${month} ${day}`;
}
