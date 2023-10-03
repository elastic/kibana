/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { convertDateToISOString, isExecutionDurationExceededInterval } from './helpers';

moment.suppressDeprecationWarnings = true;

describe('convertDateToISOString', () => {
  const ISO_8601_PATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;

  it('converts a datemath expression to an ISO string', () => {
    const date = 'now-1d';
    const result = convertDateToISOString(date);

    expect(result).toMatch(ISO_8601_PATTERN);
  });

  it('converts a rounded datemath expression to an ISO string', () => {
    const date = 'now-30d/d';
    const result = convertDateToISOString(date);

    expect(result).toMatch(ISO_8601_PATTERN);
  });

  it('converts a regular date string to an ISO string', () => {
    const date = '2023-08-03T12:34:56.789Z';
    const result = convertDateToISOString(date);

    expect(result).toMatch(ISO_8601_PATTERN);
  });

  it('does nothing to an ISO string', () => {
    const date = '2023-08-03T12:34:56.789Z';
    const result = convertDateToISOString(date);

    expect(result).toEqual(date);
  });

  it('throws an error if the date string is invalid', () => {
    const date = 'hi mom';

    expect(() => {
      convertDateToISOString(date);
    }).toThrowErrorMatchingInlineSnapshot(`"Could not convert string \\"hi mom\\" to ISO string"`);
  });
});

describe('isExecutionDurationExceededInterval', () => {
  it('return false if the execution duration interval not defiend', () => {
    expect(isExecutionDurationExceededInterval(undefined, 1000)).toEqual(false);
  });

  it('return false if the execution duration is less than the interval', () => {
    expect(isExecutionDurationExceededInterval('1m', 59)).toEqual(false);
  });

  it('return true if the execution duration is greater than the interval', () => {
    expect(isExecutionDurationExceededInterval('1m', 61)).toEqual(true);
  });
});
