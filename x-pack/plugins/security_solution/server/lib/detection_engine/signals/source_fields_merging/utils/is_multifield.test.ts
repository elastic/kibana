/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isMultiField } from './is_multifield';

describe('is_multifield', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const dummyValue = ['value'];

  test('it returns true if the string "foo.bar" is a multiField', () => {
    expect(isMultiField('foo.bar', [['foo', dummyValue]])).toEqual(true);
  });

  test('it returns false if the string "foo" is not a multiField', () => {
    expect(isMultiField('foo', [['foo', dummyValue]])).toEqual(false);
  });

  test('it returns false if we have a sibling string and are not a multiField', () => {
    expect(isMultiField('foo.bar', [['foo.mar', dummyValue]])).toEqual(false);
  });

  test('it returns true for a 3rd level match of being a sub-object. Runtime fields can have multiple layers of multiFields', () => {
    expect(isMultiField('foo.mars.bar', [['foo', dummyValue]])).toEqual(true);
  });

  test('it returns true for a 3rd level match against a 2nd level sub-object. Runtime fields can have multiple layers of multiFields', () => {
    expect(isMultiField('foo.mars.bar', [['foo.mars', dummyValue]])).toEqual(true);
  });
});
