/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQLTimeInterval } from '@kbn/esql-ast';

const units = [
  'millisecond',
  'milliseconds',
  'ms',
  //
  'second',
  'seconds',
  'sec',
  's',
  //
  'minute',
  'minutes',
  'min',
  //
  'hour',
  'hours',
  'h',
  //
  'day',
  'days',
  'd',
  //
  'week',
  'weeks',
  'w',
  //
  'month',
  'months',
  'mo',
  //
  'quarter',
  'quarters',
  'q',
  //
  'year',
  'years',
  'yr',
  'y',
];

const timespanStringRegexp = new RegExp(`^["']?([0-9]+)?\\s*?(${units.join('|')})["']?$`, 'i');

export function createTimespanLiteral(unit: string, quantity: number): ESQLTimeInterval {
  return {
    type: 'timeInterval',
    quantity,
    unit,
    text: `${unit}${quantity}`,
    name: `${unit} ${quantity}`,
    incomplete: false,
    location: { min: 0, max: 0 },
  };
}

export function isTimespanString(str: string): boolean {
  return Boolean(str.match(timespanStringRegexp));
}

export function stringToTimespanLiteral(str: string): ESQLTimeInterval {
  const match = timespanStringRegexp.exec(str);
  if (!match) {
    throw new Error(`String "${str}" cannot be converted to timespan literal`);
  }
  const [_, quantity, unit] = match;

  return createTimespanLiteral(unit, quantity ? parseInt(quantity, 10) : 1);
}
