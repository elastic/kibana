/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSavedObjectNamePatternForExceptionsList } from '.';

describe('get_saved_object_name_pattern_for_exception_list', () => {
  test('returns expected pattern given a zero for a namespace type of "exception-list"', () => {
    expect(
      getSavedObjectNamePatternForExceptionsList({ savedObjectType: 'exception-list', index: 0 })
    ).toEqual(`exception-list_0`);
  });

  test('returns expected pattern given a zero for a namespace type of "exception-list-agnostic"', () => {
    expect(
      getSavedObjectNamePatternForExceptionsList({
        savedObjectType: 'exception-list-agnostic',
        index: 0,
      })
    ).toEqual(`exception-list-agnostic_0`);
  });

  test('returns expected pattern given a positive number for a namespace type of "exception-list"', () => {
    expect(
      getSavedObjectNamePatternForExceptionsList({ savedObjectType: 'exception-list', index: 1 })
    ).toEqual(`exception-list_1`);
  });

  test('returns expected pattern given a positive number for a namespace type of "exception-list-agnostic"', () => {
    expect(
      getSavedObjectNamePatternForExceptionsList({
        savedObjectType: 'exception-list-agnostic',
        index: 1,
      })
    ).toEqual(`exception-list-agnostic_1`);
  });

  test('throws given less than zero', () => {
    expect(() =>
      getSavedObjectNamePatternForExceptionsList({ savedObjectType: 'exception-list', index: -1 })
    ).toThrow('"index" should alway be >= 0 instead of: -1');
  });

  test('throws given NaN', () => {
    expect(() =>
      getSavedObjectNamePatternForExceptionsList({ savedObjectType: 'exception-list', index: NaN })
    ).toThrow('"index" should alway be >= 0 instead of: NaN');
  });
});
