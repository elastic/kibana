/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filterFieldEntry } from './filter_field_entry';
import type { FieldsType } from '../types';

describe('filter_field_entry', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  /** Dummy test value */
  const dummyValue = ['value'];

  test('returns true for a valid field entry', () => {
    const fieldEntries: Array<[string, FieldsType]> = [['foo.bar', dummyValue]];
    expect(filterFieldEntry(fieldEntries[0], fieldEntries, {}, [])).toEqual(true);
  });

  test('returns false for invalid dotted entries', () => {
    const fieldEntries: Array<[string, FieldsType]> = [
      ['.', dummyValue],
      ['foo.bar', dummyValue],
      ['..', dummyValue],
      ['foo..bar', dummyValue],
    ];
    expect(filterFieldEntry(['.', dummyValue], fieldEntries, {}, [])).toEqual(false);
    expect(filterFieldEntry(['foo.bar', dummyValue], fieldEntries, {}, [])).toEqual(true);
    expect(filterFieldEntry(['..', dummyValue], fieldEntries, {}, [])).toEqual(false);
    expect(filterFieldEntry(['foo..bar', dummyValue], fieldEntries, {}, [])).toEqual(false);
  });

  test('removes multi-field values such "foo.keyword" mixed with "foo" and prefers just "foo" for 1st level', () => {
    const fieldEntries: Array<[string, FieldsType]> = [
      ['foo', dummyValue],
      ['foo.keyword', dummyValue], // <-- "foo.keyword" multi-field should be removed
      ['bar.keyword', dummyValue], // <-- "bar.keyword" multi-field should be removed
      ['bar', dummyValue],
    ];
    expect(filterFieldEntry(['foo', dummyValue], fieldEntries, {}, [])).toEqual(true);
    expect(filterFieldEntry(['foo.keyword', dummyValue], fieldEntries, {}, [])).toEqual(false);
    expect(filterFieldEntry(['bar.keyword', dummyValue], fieldEntries, {}, [])).toEqual(false);
    expect(filterFieldEntry(['bar', dummyValue], fieldEntries, {}, [])).toEqual(true);
  });

  test('removes multi-field values such "host.name.keyword" mixed with "host.name" and prefers just "host.name" for 2nd level', () => {
    const fieldEntries: Array<[string, FieldsType]> = [
      ['host.name', dummyValue],
      ['host.name.keyword', dummyValue], // <-- multi-field should be removed
      ['host.hostname', dummyValue],
      ['host.hostname.keyword', dummyValue], // <-- multi-field should be removed
    ];
    expect(filterFieldEntry(['host.name', dummyValue], fieldEntries, {}, [])).toEqual(true);
    expect(filterFieldEntry(['host.name.keyword', dummyValue], fieldEntries, {}, [])).toEqual(
      false
    );
    expect(filterFieldEntry(['host.hostname', dummyValue], fieldEntries, {}, [])).toEqual(true);
    expect(filterFieldEntry(['host.hostname.keyword', dummyValue], fieldEntries, {}, [])).toEqual(
      false
    );
  });

  test('removes multi-field values such "foo.host.name.keyword" mixed with "foo.host.name" and prefers just "foo.host.name" for 3rd level', () => {
    const fieldEntries: Array<[string, FieldsType]> = [
      ['foo.host.name', dummyValue],
      ['foo.host.name.keyword', dummyValue], // <-- multi-field should be removed
      ['foo.host.hostname', dummyValue],
      ['foo.host.hostname.keyword', dummyValue], // <-- multi-field should be removed
    ];
    expect(filterFieldEntry(['foo.host.name', dummyValue], fieldEntries, {}, [])).toEqual(true);
    expect(filterFieldEntry(['foo.host.name.keyword', dummyValue], fieldEntries, {}, [])).toEqual(
      false
    );
    expect(filterFieldEntry(['foo.host.hostname', dummyValue], fieldEntries, {}, [])).toEqual(true);
    expect(
      filterFieldEntry(['foo.host.hostname.keyword', dummyValue], fieldEntries, {}, [])
    ).toEqual(false);
  });

  test('ignores fields of "_ignore", for eql bug https://github.com/elastic/elasticsearch/issues/77152', () => {
    const fieldEntries: Array<[string, FieldsType]> = [
      ['_ignored', dummyValue],
      ['foo.host.hostname', dummyValue],
    ];
    expect(filterFieldEntry(['_ignored', dummyValue], fieldEntries, {}, [])).toEqual(false);
    expect(filterFieldEntry(['foo.host.hostname', dummyValue], fieldEntries, {}, [])).toEqual(true);
  });

  test('ignores fields given strings and regular expressions in the ignoreFields list', () => {
    const fieldEntries: Array<[string, FieldsType]> = [
      ['host.name', dummyValue],
      ['user.name', dummyValue], // <-- string from ignoreFields should ignore this
      ['host.hostname', dummyValue],
      ['_odd.value', dummyValue], // <-- regular expression from ignoreFields should ignore this
    ];
    expect(
      filterFieldEntry(['host.name', dummyValue], fieldEntries, { 'user.name': true }, ['/[_]+/'])
    ).toEqual(true);
    expect(
      filterFieldEntry(['user.name', dummyValue], fieldEntries, { 'user.name': true }, ['/[_]+/'])
    ).toEqual(false);
    expect(
      filterFieldEntry(['host.hostname', dummyValue], fieldEntries, { 'user.name': true }, [
        '/[_]+/',
      ])
    ).toEqual(true);
    expect(
      filterFieldEntry(['_odd.value', dummyValue], fieldEntries, { 'user.name': true }, ['/[_]+/'])
    ).toEqual(false);
  });
});
