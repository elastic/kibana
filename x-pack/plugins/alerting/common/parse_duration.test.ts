/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  parseDuration,
  formatDuration,
  getDurationNumberInItsUnit,
  getDurationUnitValue,
} from './parse_duration';

test('parses seconds', () => {
  const result = parseDuration('10s');
  expect(result).toEqual(10000);
});

test('parses minutes', () => {
  const result = parseDuration('10m');
  expect(result).toEqual(600000);
});

test('parses hours', () => {
  const result = parseDuration('10h');
  expect(result).toEqual(36000000);
});

test('parses days', () => {
  const result = parseDuration('10d');
  expect(result).toEqual(864000000);
});

test('throws error when the format is invalid', () => {
  expect(() => parseDuration('10x')).toThrowErrorMatchingInlineSnapshot(
    `"Invalid duration \\"10x\\". Durations must be of the form {number}x. Example: 5s, 5m, 5h or 5d\\""`
  );
});

test('throws error when suffix is missing', () => {
  expect(() => parseDuration('1000')).toThrowErrorMatchingInlineSnapshot(
    `"Invalid duration \\"1000\\". Durations must be of the form {number}x. Example: 5s, 5m, 5h or 5d\\""`
  );
});

test('formats single second', () => {
  const result = formatDuration('1s');
  expect(result).toEqual('1 sec');
});

test('formats single second with full unit', () => {
  const result = formatDuration('1s', true);
  expect(result).toEqual('1 second');
});

test('formats seconds', () => {
  const result = formatDuration('10s');
  expect(result).toEqual('10 sec');
});

test('formats seconds with full unit', () => {
  const result = formatDuration('10s', true);
  expect(result).toEqual('10 seconds');
});

test('formats single minute', () => {
  const result = formatDuration('1m');
  expect(result).toEqual('1 min');
});

test('formats single minute with full unit', () => {
  const result = formatDuration('1m', true);
  expect(result).toEqual('1 minute');
});

test('formats minutes', () => {
  const result = formatDuration('10m');
  expect(result).toEqual('10 min');
});

test('formats minutes with full unit', () => {
  const result = formatDuration('10m', true);
  expect(result).toEqual('10 minutes');
});

test('formats single hour', () => {
  const result = formatDuration('1h');
  expect(result).toEqual('1 hr');
});

test('formats single hour with full unit', () => {
  const result = formatDuration('1h', true);
  expect(result).toEqual('1 hour');
});

test('formats hours', () => {
  const result = formatDuration('10h');
  expect(result).toEqual('10 hr');
});

test('formats hours with full unit', () => {
  const result = formatDuration('10h', true);
  expect(result).toEqual('10 hours');
});

test('formats single day', () => {
  const result = formatDuration('1d');
  expect(result).toEqual('1 day');
});

test('formats single day with full unit', () => {
  const result = formatDuration('1d', true);
  expect(result).toEqual('1 day');
});

test('formats days', () => {
  const result = formatDuration('10d');
  expect(result).toEqual('10 days');
});

test('formats days with full unit', () => {
  const result = formatDuration('10d', true);
  expect(result).toEqual('10 days');
});

test('format throws error when the format is invalid', () => {
  expect(() => formatDuration('10x')).toThrowErrorMatchingInlineSnapshot(
    `"Invalid duration \\"10x\\". Durations must be of the form {number}x. Example: 5s, 5m, 5h or 5d\\""`
  );
});

test('format throws error when suffix is missing', () => {
  expect(() => formatDuration('1000')).toThrowErrorMatchingInlineSnapshot(
    `"Invalid duration \\"1000\\". Durations must be of the form {number}x. Example: 5s, 5m, 5h or 5d\\""`
  );
});

test('throws error when 0 based', () => {
  expect(() => parseDuration('0s')).toThrowErrorMatchingInlineSnapshot(
    `"Invalid duration \\"0s\\". Durations must be of the form {number}x. Example: 5s, 5m, 5h or 5d\\""`
  );
  expect(() => parseDuration('0m')).toThrowErrorMatchingInlineSnapshot(
    `"Invalid duration \\"0m\\". Durations must be of the form {number}x. Example: 5s, 5m, 5h or 5d\\""`
  );
  expect(() => parseDuration('0h')).toThrowErrorMatchingInlineSnapshot(
    `"Invalid duration \\"0h\\". Durations must be of the form {number}x. Example: 5s, 5m, 5h or 5d\\""`
  );
  expect(() => parseDuration('0d')).toThrowErrorMatchingInlineSnapshot(
    `"Invalid duration \\"0d\\". Durations must be of the form {number}x. Example: 5s, 5m, 5h or 5d\\""`
  );
});

test('getDurationNumberInItsUnit days', () => {
  const result = getDurationNumberInItsUnit('10d');
  expect(result).toEqual(10);
});

test('getDurationNumberInItsUnit minutes', () => {
  const result = getDurationNumberInItsUnit('1m');
  expect(result).toEqual(1);
});

test('getDurationNumberInItsUnit seconds', () => {
  const result = getDurationNumberInItsUnit('123s');
  expect(result).toEqual(123);
});

test('getDurationUnitValue minutes', () => {
  const result = getDurationUnitValue('1m');
  expect(result).toEqual('m');
});

test('getDurationUnitValue days', () => {
  const result = getDurationUnitValue('23d');
  expect(result).toEqual('d');
});

test('getDurationUnitValue hours', () => {
  const result = getDurationUnitValue('100h');
  expect(result).toEqual('h');
});
