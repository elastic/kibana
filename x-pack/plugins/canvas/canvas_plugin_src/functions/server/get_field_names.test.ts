/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-expect-error untyped library
import { parse } from 'tinymath';
import { getFieldNames } from './pointseries/lib/get_field_names';

describe('getFieldNames', () => {
  it('returns array of field names referenced in a parsed math object', () => {
    expect(getFieldNames([], parse('2+3'))).toEqual([]);
    expect(getFieldNames([], parse('mean(foo)'))).toEqual(['foo']);
    expect(getFieldNames([], parse('max(foo + bar)'))).toEqual(['foo', 'bar']);
    expect(getFieldNames([], parse('count(foo) + count(bar)'))).toEqual(['foo', 'bar']);
    expect(
      getFieldNames([], parse('sum(count(foo),count(bar),count(fizz),count(buzz),2,3,4)'))
    ).toEqual(['foo', 'bar', 'fizz', 'buzz']);
  });
});
