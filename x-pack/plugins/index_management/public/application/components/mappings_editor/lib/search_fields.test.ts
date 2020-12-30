/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { searchFields } from './search_fields';
import { NormalizedField } from '../types';
import { getUniqueId } from '../lib';

const irrelevantProps = {
  canHaveChildFields: false,
  canHaveMultiFields: true,
  childFieldsName: 'fields' as 'fields',
  hasChildFields: false,
  hasMultiFields: false,
  isExpanded: false,
  isMultiField: false,
  nestedDepth: 1,
};

const getField = (
  source: any,
  path = ['some', 'field', 'path'],
  id = getUniqueId()
): NormalizedField => ({
  id,
  source: {
    ...source,
    name: path[path.length - 1],
  },
  path,
  ...irrelevantProps,
});

describe('Search fields', () => {
  test('should return empty array when no result found', () => {
    const field = getField({ type: 'text' });
    const allFields = {
      [field.id]: field,
    };
    const searchTerm = 'keyword';

    const result = searchFields(searchTerm, allFields);
    expect(result).toEqual([]);
  });

  test('should return field if path contains search term', () => {
    const field = getField({ type: 'text' }, ['someObject', 'property']);
    const allFields = {
      [field.id]: field,
    };
    const searchTerm = 'proper';

    const result = searchFields(searchTerm, allFields);
    expect(result.length).toBe(1);
    expect(result[0].field).toEqual(field);
  });

  test('should return field if type matches part of search term', () => {
    const field = getField({ type: 'keyword' });
    const allFields = {
      [field.id]: field,
    };
    const searchTerm = 'keywo';

    const result = searchFields(searchTerm, allFields);
    expect(result.length).toBe(1);
    expect(result[0].field).toEqual(field);
  });

  test('should give higher score if the search term matches the "path" over the "type"', () => {
    const field1 = getField({ type: 'keyword' }, ['field1']);
    const field2 = getField({ type: 'text' }, ['field2', 'keywords']); // Higher score
    const allFields = {
      [field1.id]: field1, // field 1 comes first
      [field2.id]: field2,
    };
    const searchTerm = 'keyword';

    const result = searchFields(searchTerm, allFields);
    expect(result.length).toBe(2);
    expect(result[0].field.path).toEqual(field2.path);
    expect(result[1].field.path).toEqual(field1.path); // field 1 is second
  });

  test('should extract the "type" in multi words search', () => {
    const field1 = getField({ type: 'date' });
    const field2 = getField({ type: 'keyword' }, ['myField', 'someProp']); // Should come in result as second as only the type matches
    const field3 = getField({ type: 'text' }, ['myField', 'keyword']); // Path match scores higher than the field type

    const allFields = {
      [field1.id]: field1,
      [field2.id]: field2,
      [field3.id]: field3,
    };
    const searchTerm = 'myField keyword';

    const result = searchFields(searchTerm, allFields);
    expect(result.length).toBe(2);
    expect(result[0].field.path).toEqual(field3.path);
    expect(result[1].field.path).toEqual(field2.path);
  });

  test('should *NOT* extract the "type" in multi-words search if in the middle of 2 words', () => {
    const field1 = getField({ type: 'date' });
    const field2 = getField({ type: 'keyword' }, ['shouldNotMatch']);
    const field3 = getField({ type: 'text' }, ['myField', 'keyword_more']); // Only valid result. Case incensitive.

    const allFields = {
      [field1.id]: field1,
      [field2.id]: field2,
      [field3.id]: field3,
    };
    const searchTerm = 'myField keyword more';

    const result = searchFields(searchTerm, allFields);
    expect(result.length).toBe(1);
    expect(result[0].field.path).toEqual(field3.path);
  });

  test('should be case insensitive', () => {
    const field1 = getField({ type: 'text' }, ['myFirstField']);
    const field2 = getField({ type: 'text' }, ['myObject', 'firstProp']);

    const allFields = {
      [field1.id]: field1,
      [field2.id]: field2,
    };

    const searchTerm = 'first';

    const result = searchFields(searchTerm, allFields);
    expect(result.length).toBe(2);
    expect(result[0].field.path).toEqual(field2.path);
    expect(result[1].field.path).toEqual(field1.path);
  });

  test('should refine search with multiple terms', () => {
    const field1 = getField({ type: 'text' }, ['myObject']);
    const field2 = getField({ type: 'keyword' }, ['myObject', 'someProp']);

    const allFields = {
      [field1.id]: field1,
      [field2.id]: field2,
    };

    const searchTerm = 'myObject someProp';

    const result = searchFields(searchTerm, allFields);
    expect(result.length).toBe(1);
    expect(result[0].field.path).toEqual(field2.path); // Field 2 first as it matches the type
  });

  test('should sort first match on field name before descendants', () => {
    const field1 = getField({ type: 'text' }, ['server', 'space', 'myField']);
    const field2 = getField({ type: 'text' }, ['myObject', 'server']);
    const field3 = getField({ type: 'text' }, ['server']);

    const allFields = {
      [field1.id]: field1,
      [field2.id]: field2,
      [field3.id]: field3,
    };

    const searchTerm = 'serve';

    const result = searchFields(searchTerm, allFields);
    expect(result.length).toBe(3);
    expect(result[0].field.path).toEqual(field3.path); // Should come first as it has the shortest path
    expect(result[1].field.path).toEqual(field2.path); // Field 2 name _is_ the search term, comes first
    expect(result[2].field.path).toEqual(field1.path);
  });

  test('should sort first field whose name fully matches the term', () => {
    const field1 = getField({ type: 'text' }, ['aerospke', 'namespace']);
    const field2 = getField({ type: 'text' }, ['agent', 'name']);

    const allFields = {
      [field1.id]: field1,
      [field2.id]: field2,
    };

    const searchTerm = 'name';

    const result = searchFields(searchTerm, allFields);
    expect(result.length).toBe(2);
    expect(result[0].field.path).toEqual(field2.path); // Field 2 name fully matches
    expect(result[1].field.path).toEqual(field1.path);
  });

  test('should return empty result if searching for ">"', () => {
    const field1 = getField({ type: 'text' }, ['aerospke', 'namespace']);

    const allFields = {
      [field1.id]: field1,
    };

    const searchTerm = '>';

    const result = searchFields(searchTerm, allFields);
    expect(result.length).toBe(0);
  });
});
