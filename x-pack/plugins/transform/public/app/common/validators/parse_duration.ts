/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedDuration } from './types';

const TIME_UNITS = ['nanos', 'micros', 'ms', 's', 'm', 'h', 'd'];

/**
 * Parses a duration uses a string format like `60s`.
 * @param value User input value.
 */
export function parseDuration(value: string): ParsedDuration | undefined {
  if (typeof value !== 'string' || value === null) {
    return;
  }

  // split string by groups of numbers and letters
  const regexStr = value.match(/[a-z]+|[^a-z]+/gi);

  // only valid if one group of numbers and one group of letters
  if (regexStr === null || (Array.isArray(regexStr) && regexStr.length !== 2)) {
    return;
  }

  const number = +regexStr[0];
  const timeUnit = regexStr[1];

  // only valid if number is an integer
  if (isNaN(number) || !Number.isInteger(number)) {
    return;
  }

  if (!TIME_UNITS.includes(timeUnit)) {
    return;
  }

  return { number, timeUnit };
}
