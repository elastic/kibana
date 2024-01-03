/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidFrequency } from './is_valid_frequency';

/**
 * Validates transform frequency input.
 * Allows time units of s/m/h only.
 * Must be above 0 and only up to 1h.
 * @param value User input value.
 */
export const isTransformWizardFrequency = (value: string): boolean => {
  if (typeof value !== 'string' || value === null) {
    return false;
  }

  // split string by groups of numbers and letters
  const regexStr = value.match(/[a-z]+|[^a-z]+/gi);

  // only valid if one group of numbers and one group of letters
  if (regexStr === null || (Array.isArray(regexStr) && regexStr.length !== 2)) {
    return false;
  }

  const number = +regexStr[0];
  const timeUnit = regexStr[1];

  // only valid if number is an integer above 0
  if (isNaN(number) || !Number.isInteger(number) || number === 0) {
    return false;
  }

  return isValidFrequency({ number, timeUnit });
};
