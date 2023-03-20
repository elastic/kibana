/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSavedObjectNamePattern } from '.';

describe('get_saved_object_name_pattern_for_exception_list', () => {
  test('returns expected pattern given a zero', () => {
    expect(getSavedObjectNamePattern({ name: 'test', index: 0 })).toEqual('test_0');
  });

  test('returns expected pattern given a positive number', () => {
    expect(getSavedObjectNamePattern({ name: 'test', index: 1 })).toEqual('test_1');
  });

  test('throws given less than zero', () => {
    expect(() => getSavedObjectNamePattern({ name: 'test', index: -1 })).toThrow(
      '"index" should alway be >= 0 instead of: -1'
    );
  });

  test('throws given NaN', () => {
    expect(() => getSavedObjectNamePattern({ name: 'test', index: NaN })).toThrow(
      '"index" should alway be >= 0 instead of: NaN'
    );
  });
});
