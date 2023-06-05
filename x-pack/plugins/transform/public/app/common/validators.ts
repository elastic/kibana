/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { numberValidator } from '@kbn/ml-agg-utils';
import {
  numberOfRetriesInvalidErrorMessage,
  pageSearchSizeInvalidErrorMessage,
} from '../constants/validation_messages';

const RETENTION_POLICY_MIN_AGE_SECONDS = 60;
const TIME_UNITS = ['nanos', 'micros', 'ms', 's', 'm', 'h', 'd'];

/**
 * Validates continuous mode time delay input.
 * Doesn't allow floating intervals.
 * @param value User input value.
 */
export function continuousModeDelayValidator(value: string): boolean {
  return value.match(/^(0|\d*(nanos|micros|ms|s|m|h|d))$/) !== null;
}

/**
 * Parses a duration uses a string format like `60s`.
 * @param value User input value.
 */
export interface ParsedDuration {
  number: number;
  timeUnit: string;
}
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

export function isValidRetentionPolicyMaxAge({ number, timeUnit }: ParsedDuration): boolean {
  // only valid if value is equal or more than 60s
  // supported time units: https://www.elastic.co/guide/en/elasticsearch/reference/master/common-options.html#time-units
  return (
    (timeUnit === 'nanos' && number >= RETENTION_POLICY_MIN_AGE_SECONDS * 1000000000) ||
    (timeUnit === 'micros' && number >= RETENTION_POLICY_MIN_AGE_SECONDS * 1000000) ||
    (timeUnit === 'ms' && number >= RETENTION_POLICY_MIN_AGE_SECONDS * 1000) ||
    (timeUnit === 's' && number >= RETENTION_POLICY_MIN_AGE_SECONDS) ||
    ((timeUnit === 'm' || timeUnit === 'h' || timeUnit === 'd') && number >= 1)
  );
}

/**
 * Validates retention policy max age input.
 * Doesn't allow floating intervals.
 * @param value User input value. Minimum of 60s.
 */
export function retentionPolicyMaxAgeValidator(value: string): boolean {
  const parsedValue = parseDuration(value);

  if (parsedValue === undefined) {
    return false;
  }

  return isValidRetentionPolicyMaxAge(parsedValue);
}

// only valid if value is up to 1 hour
export function isValidFrequency({ number, timeUnit }: ParsedDuration): boolean {
  return (
    (timeUnit === 's' && number <= 3600) ||
    (timeUnit === 'm' && number <= 60) ||
    (timeUnit === 'h' && number === 1)
  );
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

// The reducers and utility functions in this file provide the following features:
// - getDefaultState()
//   Sets up the initial form state. It supports overrides to apply a pre-existing configuration.
//   The implementation of this function is the only one that's specifically required to define
//   the features of the transform edit form. All other functions are generic and could be reused
//   in the future for other forms.
//
// - formReducerFactory() / formFieldReducer()
//   These nested reducers take care of updating and validating the form state.
//
// - applyFormStateToTransformConfig() (iterates over getUpdateValue())
//   Once a user hits the update button, these functions take care of extracting the information
//   necessary to create the update request. They take into account whether a field needs to
//   be included at all in the request (for example, if it hadn't been changed).
//   The code is also able to identify relationships/dependencies between form fields.
//   For example, if the `pipeline` field was changed, it's necessary to make the `index`
//   field part of the request, otherwise the update would fail.

// A Validator function takes in a value to check and returns an array of error messages.
// If no messages (empty array) get returned, the value is valid.
export type Validator = (value: any, isOptional?: boolean) => string[];

/**
 * Validates transform max_page_search_size input.
 * Must be a number between 10 and 65536.
 * @param value User input value.
 */
export const transformSettingsPageSearchSizeValidator: Validator = (value) =>
  !(value + '').includes('.') &&
  numberValidator({ min: 10, max: 65536, integerOnly: true })(+value) === null
    ? []
    : [pageSearchSizeInvalidErrorMessage];

export const transformSettingsNumberOfRetriesValidator: Validator = (value) =>
  !(value + '').includes('.') &&
  numberValidator({ min: -1, max: 100, integerOnly: true })(+value) === null
    ? []
    : [numberOfRetriesInvalidErrorMessage];

/**
 * Validates whether string input can be parsed as a valid JSON
 * @param value User input value.
 */
export function jsonStringValidator(value: unknown): boolean {
  if (typeof value !== 'string') return false;

  try {
    return !!JSON.parse(value);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`JSON is invalid.\n${e}`);
    return false;
  }
  return true;
}
