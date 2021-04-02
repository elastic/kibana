/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDuration, getDurationNumberInItsUnit, getDurationUnitValue } from './parse_duration';

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
