/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filterFieldEntries } from './filter_field_entries';
import { FieldsType } from '../types';

describe('filter_field_entries', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  /** Dummy test value */
  const dummyValue = ['value'];

  /**
   * Get the return type of the mergeFieldsWithSource for TypeScript checks against expected
   */
  type ReturnTypeFilterFieldEntries = ReturnType<typeof filterFieldEntries>;

  test('returns a single valid fieldEntries as expected', () => {
    const fieldEntries: Array<[string, FieldsType]> = [['foo.bar', dummyValue]];
    expect(filterFieldEntries(fieldEntries, [])).toEqual<ReturnTypeFilterFieldEntries>(
      fieldEntries
    );
  });

  test('removes invalid dotted entries', () => {
    const fieldEntries: Array<[string, FieldsType]> = [
      ['.', dummyValue],
      ['foo.bar', dummyValue],
      ['..', dummyValue],
      ['foo..bar', dummyValue],
    ];
    expect(filterFieldEntries(fieldEntries, [])).toEqual<ReturnTypeFilterFieldEntries>([
      ['foo.bar', dummyValue],
    ]);
  });

  test('removes multi-field values such "foo.keyword" mixed with "foo" and prefers just "foo" for 1st level', () => {
    const fieldEntries: Array<[string, FieldsType]> = [
      ['foo', dummyValue],
      ['foo.keyword', dummyValue], // <-- "foo.keyword" multi-field should be removed
      ['bar.keyword', dummyValue], // <-- "bar.keyword" multi-field should be removed
      ['bar', dummyValue],
    ];
    expect(filterFieldEntries(fieldEntries, [])).toEqual<ReturnTypeFilterFieldEntries>([
      ['foo', dummyValue],
      ['bar', dummyValue],
    ]);
  });

  test('removes multi-field values such "host.name.keyword" mixed with "host.name" and prefers just "host.name" for 2nd level', () => {
    const fieldEntries: Array<[string, FieldsType]> = [
      ['host.name', dummyValue],
      ['host.name.keyword', dummyValue], // <-- multi-field should be removed
      ['host.hostname', dummyValue],
      ['host.hostname.keyword', dummyValue], // <-- multi-field should be removed
    ];
    expect(filterFieldEntries(fieldEntries, [])).toEqual<ReturnTypeFilterFieldEntries>([
      ['host.name', dummyValue],
      ['host.hostname', dummyValue],
    ]);
  });

  test('removes multi-field values such "foo.host.name.keyword" mixed with "foo.host.name" and prefers just "foo.host.name" for 3rd level', () => {
    const fieldEntries: Array<[string, FieldsType]> = [
      ['foo.host.name', dummyValue],
      ['foo.host.name.keyword', dummyValue], // <-- multi-field should be removed
      ['foo.host.hostname', dummyValue],
      ['foo.host.hostname.keyword', dummyValue], // <-- multi-field should be removed
    ];
    expect(filterFieldEntries(fieldEntries, [])).toEqual<ReturnTypeFilterFieldEntries>([
      ['foo.host.name', dummyValue],
      ['foo.host.hostname', dummyValue],
    ]);
  });

  test('ignores fields of "_ignore", for eql bug https://github.com/elastic/elasticsearch/issues/77152', () => {
    const fieldEntries: Array<[string, FieldsType]> = [
      ['_ignored', dummyValue],
      ['foo.host.hostname', dummyValue],
    ];
    expect(filterFieldEntries(fieldEntries, [])).toEqual<ReturnTypeFilterFieldEntries>([
      ['foo.host.hostname', dummyValue],
    ]);
  });

  test('ignores fields given strings and regular expressions in the ignoreFields list', () => {
    const fieldEntries: Array<[string, FieldsType]> = [
      ['host.name', dummyValue],
      ['user.name', dummyValue], // <-- string from ignoreFields should ignore this
      ['host.hostname', dummyValue],
      ['_odd.value', dummyValue], // <-- regular expression from ignoreFields should ignore this
    ];
    expect(
      filterFieldEntries(fieldEntries, ['user.name', '/[_]+/'])
    ).toEqual<ReturnTypeFilterFieldEntries>([
      ['host.name', dummyValue],
      ['host.hostname', dummyValue],
    ]);
  });
});
