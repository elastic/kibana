/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  emptyTable,
  testTable,
} from '../../canvas_plugin_src/functions/common/__tests__/fixtures/test_tables';
import { getFieldType } from './get_field_type';

describe('getFieldType', () => {
  it('returns type of a field in a datatable', () => {
    expect(getFieldType(testTable.columns, 'name')).toBe('string');
    expect(getFieldType(testTable.columns, 'time')).toBe('date');
    expect(getFieldType(testTable.columns, 'price')).toBe('number');
    expect(getFieldType(testTable.columns, 'quantity')).toBe('number');
    expect(getFieldType(testTable.columns, 'in_stock')).toBe('boolean');
  });
  it(`returns 'null' if field does not exist in datatable`, () => {
    expect(getFieldType(testTable.columns, 'foo')).toBe('null');
    expect(getFieldType(emptyTable.columns, 'foo')).toBe('null');
  });
});
