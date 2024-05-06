/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Fields } from '../../../../../common/search_strategy';
import { getNestedParentPath } from './get_nested_parent_path';

describe('getNestedParentPath', () => {
  let testFields: Fields | undefined;
  beforeAll(() => {
    testFields = {
      'not.nested': ['I am not nested'],
      'is.nested': [
        {
          field: ['I am nested'],
        },
      ],
    };
  });

  it('should ignore fields that are not nested', () => {
    const notNestedPath = 'not.nested';
    const shouldBeUndefined = getNestedParentPath(notNestedPath, testFields);
    expect(shouldBeUndefined).toBe(undefined);
  });

  it('should capture fields that are nested', () => {
    const nestedPath = 'is.nested.field';
    const nestedParentPath = getNestedParentPath(nestedPath, testFields);
    expect(nestedParentPath).toEqual('is.nested');
  });

  it('should return undefined when the `fields` param is undefined', () => {
    const nestedPath = 'is.nested.field';
    expect(getNestedParentPath(nestedPath, undefined)).toBe(undefined);
  });
});
