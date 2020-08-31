/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { transformers } from './transformers';

const { informationCreated, informationUpdated, informationAdded, append } = transformers;

describe('informationCreated', () => {
  test('transforms correctly', () => {
    const res = informationCreated({
      value: 'a value',
      date: '2020-04-15T08:19:27.400Z',
      user: 'elastic',
    });
    expect(res).toEqual({ value: 'a value (created at 2020-04-15T08:19:27.400Z by elastic)' });
  });

  test('transforms correctly without optional fields', () => {
    const res = informationCreated({
      value: 'a value',
    });
    expect(res).toEqual({ value: 'a value (created at  by )' });
  });

  test('returns correctly rest fields', () => {
    const res = informationCreated({
      value: 'a value',
      date: '2020-04-15T08:19:27.400Z',
      user: 'elastic',
      previousValue: 'previous value',
    });
    expect(res).toEqual({
      value: 'a value (created at 2020-04-15T08:19:27.400Z by elastic)',
      previousValue: 'previous value',
    });
  });
});

describe('informationUpdated', () => {
  test('transforms correctly', () => {
    const res = informationUpdated({
      value: 'a value',
      date: '2020-04-15T08:19:27.400Z',
      user: 'elastic',
    });
    expect(res).toEqual({ value: 'a value (updated at 2020-04-15T08:19:27.400Z by elastic)' });
  });

  test('transforms correctly without optional fields', () => {
    const res = informationUpdated({
      value: 'a value',
    });
    expect(res).toEqual({ value: 'a value (updated at  by )' });
  });

  test('returns correctly rest fields', () => {
    const res = informationUpdated({
      value: 'a value',
      date: '2020-04-15T08:19:27.400Z',
      user: 'elastic',
      previousValue: 'previous value',
    });
    expect(res).toEqual({
      value: 'a value (updated at 2020-04-15T08:19:27.400Z by elastic)',
      previousValue: 'previous value',
    });
  });
});

describe('informationAdded', () => {
  test('transforms correctly', () => {
    const res = informationAdded({
      value: 'a value',
      date: '2020-04-15T08:19:27.400Z',
      user: 'elastic',
    });
    expect(res).toEqual({ value: 'a value (added at 2020-04-15T08:19:27.400Z by elastic)' });
  });

  test('transforms correctly without optional fields', () => {
    const res = informationAdded({
      value: 'a value',
    });
    expect(res).toEqual({ value: 'a value (added at  by )' });
  });

  test('returns correctly rest fields', () => {
    const res = informationAdded({
      value: 'a value',
      date: '2020-04-15T08:19:27.400Z',
      user: 'elastic',
      previousValue: 'previous value',
    });
    expect(res).toEqual({
      value: 'a value (added at 2020-04-15T08:19:27.400Z by elastic)',
      previousValue: 'previous value',
    });
  });
});

describe('append', () => {
  test('transforms correctly', () => {
    const res = append({
      value: 'a value',
      previousValue: 'previous value',
    });
    expect(res).toEqual({ value: 'previous value \r\na value' });
  });

  test('transforms correctly without optional fields', () => {
    const res = append({
      value: 'a value',
    });
    expect(res).toEqual({ value: 'a value' });
  });

  test('returns correctly rest fields', () => {
    const res = append({
      value: 'a value',
      user: 'elastic',
      previousValue: 'previous value',
    });
    expect(res).toEqual({
      value: 'previous value \r\na value',
      user: 'elastic',
    });
  });
});
