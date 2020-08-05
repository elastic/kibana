/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functionWrapper } from '../../../__tests__/helpers/function_wrapper';
import { testTable } from './__tests__/fixtures/test_tables';
import { dropdownControl } from './dropdownControl';

describe('dropdownControl', () => {
  const fn = functionWrapper(dropdownControl);
  const uniqueNames = testTable.rows.reduce(
    (unique, { name }) => (unique.includes(name) ? unique : unique.concat([name])),
    []
  );

  it('returns a render as dropdown_filter', () => {
    expect(fn(testTable, { filterColumn: 'name', valueColumn: 'name' })).toHaveProperty(
      'type',
      'render'
    );
    expect(fn(testTable, { filterColumn: 'name', valueColumn: 'name' })).toHaveProperty(
      'as',
      'dropdown_filter'
    );
  });

  describe('args', () => {
    describe('valueColumn', () => {
      it('populates dropdown choices with unique values in valueColumn', () => {
        expect(fn(testTable, { valueColumn: 'name' }).value.choices).toEqual(uniqueNames);
      });

      it('returns an empty array when provided an invalid column', () => {
        expect(fn(testTable, { valueColumn: 'foo' }).value.choices).toEqual([]);
        expect(fn(testTable, { valueColumn: '' }).value.choices).toEqual([]);
      });
    });
  });

  describe('filterColumn', () => {
    it('sets which column the filter is applied to', () => {
      expect(fn(testTable, { filterColumn: 'name' }).value).toHaveProperty('column', 'name');
      expect(fn(testTable, { filterColumn: 'name', valueColumn: 'price' }).value).toHaveProperty(
        'column',
        'name'
      );
    });

    it('defaults to valueColumn if not provided', () => {
      expect(fn(testTable, { valueColumn: 'price' }).value).toHaveProperty('column', 'price');
    });

    it('sets column to undefined if no args are provided', () => {
      expect(fn(testTable).value).toHaveProperty('column', undefined);
    });
  });
});
