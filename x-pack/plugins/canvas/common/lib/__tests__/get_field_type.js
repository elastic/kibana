/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getFieldType } from '../get_field_type';
import {
  emptyTable,
  testTable,
} from '../../../canvas_plugin_src/functions/common/__tests__/fixtures/test_tables';

describe('getFieldType', () => {
  it('returns type of a field in a datatable', () => {
    expect(getFieldType(testTable.columns, 'name')).to.be('string');
    expect(getFieldType(testTable.columns, 'time')).to.be('date');
    expect(getFieldType(testTable.columns, 'price')).to.be('number');
    expect(getFieldType(testTable.columns, 'quantity')).to.be('number');
    expect(getFieldType(testTable.columns, 'in_stock')).to.be('boolean');
  });
  it(`returns 'null' if field does not exist in datatable`, () => {
    expect(getFieldType(testTable.columns, 'foo')).to.be('null');
    expect(getFieldType(emptyTable.columns, 'foo')).to.be('null');
  });
});
