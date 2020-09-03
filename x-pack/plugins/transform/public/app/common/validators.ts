/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Validates continuous mode time delay input.
 * Doesn't allow floating intervals.
 * @param value User input value.
 */
export function continuousModeDelayValidator(value: string): boolean {
  return value.match(/^(0|\d*(nanos|micros|ms|s|m|h|d))$/) !== null;
}

/**
 * Validates transform frequency input.
 * Allows time units of s/m/h only.
 * Must be above 0 and only up to 1h.
 * @param value User input value.
 */
export const transformFrequencyValidator = (value: string): boolean => {
  if (typeof value !== 'string' || value === null) {
    return false;
  }

  // split string by groups of numbers and letters
  const regexStr = value.match(/[a-z]+|[^a-z]+/gi);

  return (
    // only valid if one group of numbers and one group of letters
    regexStr !== null &&
    regexStr.length === 2 &&
    // only valid if time unit is one of s/m/h
    ['s', 'm', 'h'].includes(regexStr[1]) &&
    // only valid if number is between 1 and 59
    parseInt(regexStr[0], 10) > 0 &&
    parseInt(regexStr[0], 10) < 60 &&
    // if time unit is 'h' then number must not be higher than 1
    !(parseInt(regexStr[0], 10) > 1 && regexStr[1] === 'h')
  );
};

/**
 * Validates transform max_page_search_size input.
 * Must be a number between 10 and 10000.
 * @param value User input value.
 */
export function transformSettingsMaxPageSearchSizeValidator(value: number): boolean {
  return value >= 10 && value <= 10000;
}
