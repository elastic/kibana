/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';
import { AnomalyRecordDoc } from '../../../common/types/anomalies';
import { formatValue } from './format_value';

describe('ML - formatValue formatter', () => {
  const timeOfWeekRecord: AnomalyRecordDoc = {
    job_id: 'gallery_time_of_week',
    result_type: 'record',
    probability: 0.012818,
    record_score: 53.55134,
    initial_record_score: 53,
    bucket_span: 900,
    detector_index: 0,
    is_interim: false,
    timestamp: 1530155700000,
    by_field_name: 'clientip',
    by_field_value: '65.55.215.39',
    function: 'time_of_week',
    function_description: 'time',
  };

  const timeOfDayRecord: AnomalyRecordDoc = {
    job_id: 'gallery_time_of_day',
    result_type: 'record',
    probability: 0.012818,
    record_score: 97.94245,
    initial_record_score: 97,
    bucket_span: 900,
    detector_index: 0,
    is_interim: false,
    timestamp: 1517472900000,
    by_field_name: 'clientip',
    by_field_value: '157.56.93.83',
    function: 'time_of_day',
    function_description: 'time',
  };

  // Set timezone to US/Eastern for time_of_day and time_of_week tests.
  beforeEach(() => {
    moment.tz.setDefault('US/Eastern');
  });

  afterEach(() => {
    moment.tz.setDefault('Browser');
  });

  // For time_of_day and time_of_week test values which are offsets in seconds
  // from UTC start of week / day are formatted correctly using the test timezone.
  test('correctly formats time_of_week value from numeric input', () => {
    expect(formatValue(359739, 'time_of_week', undefined, timeOfWeekRecord)).toBe('Wed 23:55');
  });

  test('correctly formats time_of_day value from numeric input', () => {
    expect(formatValue(73781, 'time_of_day', undefined, timeOfDayRecord)).toBe('15:29');
  });

  test('correctly formats number values from numeric input', () => {
    expect(formatValue(1483228800, 'mean')).toBe(1483228800);
    expect(formatValue(1234.5678, 'mean')).toBe(1234.6);
    expect(formatValue(0.00012345, 'mean')).toBe(0.000123);
    expect(formatValue(0, 'mean')).toBe(0);
    expect(formatValue(-0.12345, 'mean')).toBe(-0.123);
    expect(formatValue(-1234.5678, 'mean')).toBe(-1234.6);
    expect(formatValue(-100000.1, 'mean')).toBe(-100000);
  });

  test('correctly formats time_of_week value from array input', () => {
    expect(formatValue([359739], 'time_of_week', undefined, timeOfWeekRecord)).toBe('Wed 23:55');
  });

  test('correctly formats time_of_day value from array input', () => {
    expect(formatValue([73781], 'time_of_day', undefined, timeOfDayRecord)).toBe('15:29');
  });

  test('correctly formats number values from array input', () => {
    expect(formatValue([1483228800], 'mean')).toBe(1483228800);
    expect(formatValue([1234.5678], 'mean')).toBe(1234.6);
    expect(formatValue([0.00012345], 'mean')).toBe(0.000123);
    expect(formatValue([0], 'mean')).toBe(0);
    expect(formatValue([-0.12345], 'mean')).toBe(-0.123);
    expect(formatValue([-1234.5678], 'mean')).toBe(-1234.6);
    expect(formatValue([-100000.1], 'mean')).toBe(-100000);
  });

  test('correctly formats multi-valued array', () => {
    expect(formatValue([30.3, 26.2], 'lat_long')).toBe('[30.3,26.2]');
  });
});
