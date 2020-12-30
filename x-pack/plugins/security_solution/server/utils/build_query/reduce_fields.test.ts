/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { reduceFields } from './reduce_fields';

describe('reduce_fields', () => {
  test('will return an empty array given an empty object', () => {
    const fieldsArray = ['field1', 'field2'];
    const fields = {};
    const reduced = reduceFields(fieldsArray, fields);
    expect(reduced).toEqual([]);
  });

  test('will return an empty array given an empty array', () => {
    const fieldsArray: string[] = [];
    const fields = {
      field1: 'field 1',
      field2: 'field 2',
    };
    const reduced = reduceFields(fieldsArray, fields);
    expect(reduced).toEqual([]);
  });

  test('will reduce 2 fields of strings given to it when they both match', () => {
    const fieldsArray = ['field1', 'field2'];
    const fields = {
      field1: 'field 1',
      field2: 'field 2',
    };
    const reduced = reduceFields(fieldsArray, fields);
    expect(reduced).toEqual(['field 1', 'field 2']);
  });

  test('will reduce 1 field of a string given to it when only it matches', () => {
    const fieldsArray = ['field1', 'field2'];
    const fields = {
      field1: 'field 1',
      field3: 'field 2',
    };
    const reduced = reduceFields(fieldsArray, fields);
    expect(reduced).toEqual(['field 1']);
  });
});
