/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapSortField } from './map_sort_field';

describe('mapSortField()', () => {
  test('should return undefined when given undefined', () => {
    expect(mapSortField(undefined)).toStrictEqual(undefined);
  });

  test('should return a mapped value when a mapping exists', () => {
    expect(mapSortField('name')).toEqual('name.keyword');
  });

  test(`should return field when a mapping doesn't exist`, () => {
    expect(mapSortField('tags')).toEqual('tags');
  });
});
