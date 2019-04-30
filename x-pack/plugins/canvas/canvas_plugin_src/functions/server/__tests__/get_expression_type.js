/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getExpressionType } from '../pointseries/lib/get_expression_type';
import { emptyTable, testTable } from '../../common/__tests__/fixtures/test_tables';

describe('getExpressionType', () => {
  it('returns the result type of an evaluated math expression', () => {
    expect(getExpressionType(testTable.columns, '2')).to.be.equal('number');
    expect(getExpressionType(testTable.colunns, '2 + 3')).to.be.equal('number');
    expect(getExpressionType(testTable.columns, 'name')).to.be.equal('string');
    expect(getExpressionType(testTable.columns, 'time')).to.be.equal('date');
    expect(getExpressionType(testTable.columns, 'price')).to.be.equal('number');
    expect(getExpressionType(testTable.columns, 'quantity')).to.be.equal('number');
    expect(getExpressionType(testTable.columns, 'in_stock')).to.be.equal('boolean');
    expect(getExpressionType(testTable.columns, 'mean(price)')).to.be.equal('number');
    expect(getExpressionType(testTable.columns, 'count(name)')).to.be.equal('string');
    expect(getExpressionType(testTable.columns, 'random()')).to.be.equal('number');
    expect(getExpressionType(testTable.columns, 'mean(multiply(price,quantity))')).to.be.eql(
      'number'
    );
  });
  it('returns date instead of number when referencing date column', () => {
    expect(getExpressionType(testTable.columns, 'mean(time)')).to.be.equal('date');
  });
  it(`returns 'null' if referenced field does not exist in datatable`, () => {
    expect(getExpressionType(testTable.columns, 'foo')).to.be.equal('null');
    expect(getExpressionType(emptyTable.columns, 'foo')).to.be.equal('null');
    expect(getExpressionType(emptyTable.columns, 'mean(foo)')).to.be.equal('string');
  });
});
