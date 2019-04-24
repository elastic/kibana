/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PIVOT_SUPPORTED_GROUP_BY_AGGS } from '../../common';

import { isIntervalValid } from './popover_form';

describe('isIntervalValid()', () => {
  test('intervalType: histogram', () => {
    expect(isIntervalValid('10', PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM)).toBe(true);
    expect(isIntervalValid('10.5', PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM)).toBe(true);
    expect(isIntervalValid('10.5.', PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM)).toBe(false);
    expect(isIntervalValid('10.5.1', PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM)).toBe(false);
    expect(isIntervalValid('0.5', PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM)).toBe(true);
    expect(isIntervalValid('.5', PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM)).toBe(false);
    expect(isIntervalValid('.5.', PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM)).toBe(false);
    expect(isIntervalValid('5m', PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM)).toBe(false);
    expect(isIntervalValid('asdf', PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM)).toBe(false);
  });

  test('intervalType: date_histogram', () => {
    expect(isIntervalValid('10', PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM)).toBe(false);
    expect(isIntervalValid('10.5', PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM)).toBe(false);
    expect(isIntervalValid('10.5.', PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM)).toBe(false);
    expect(isIntervalValid('10.5.1', PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM)).toBe(false);
    expect(isIntervalValid('0.5', PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM)).toBe(false);
    expect(isIntervalValid('.5', PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM)).toBe(false);
    expect(isIntervalValid('.5.', PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM)).toBe(false);
    expect(isIntervalValid('ms', PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM)).toBe(false);
    expect(isIntervalValid('1ms', PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM)).toBe(true);
    expect(isIntervalValid('2s', PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM)).toBe(true);
    expect(isIntervalValid('5m', PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM)).toBe(true);
    expect(isIntervalValid('6h', PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM)).toBe(true);
    expect(isIntervalValid('7d', PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM)).toBe(true);
    expect(isIntervalValid('8w', PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM)).toBe(true);
    expect(isIntervalValid('9y', PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM)).toBe(true);
    expect(isIntervalValid('12ms', PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM)).toBe(true);
    expect(isIntervalValid('23s', PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM)).toBe(true);
    expect(isIntervalValid('54m', PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM)).toBe(true);
    expect(isIntervalValid('65h', PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM)).toBe(true);
    expect(isIntervalValid('76d', PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM)).toBe(true);
    expect(isIntervalValid('87w', PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM)).toBe(true);
    expect(isIntervalValid('98y', PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM)).toBe(true);
    expect(isIntervalValid('asdf', PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM)).toBe(false);
  });
});
