/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getCell } from '../getCell';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { getFunctionErrors } from '../../../strings';
import { emptyTable, testTable } from './fixtures/test_tables';

const errors = getFunctionErrors().getCell;

describe('getCell', () => {
  const fn = functionWrapper(getCell);

  it('returns the value from the specified row and column', () => {
    const arbitraryRowIndex = 3;

    expect(fn(testTable, { column: 'quantity', row: arbitraryRowIndex })).to.eql(
      testTable.rows[arbitraryRowIndex].quantity
    );
  });

  describe('args', () => {
    const firstColumn = testTable.columns[0].name;

    it('defaults to first column in first row if no args are provided', () => {
      expect(fn(testTable)).to.be(testTable.rows[0][firstColumn]);
    });

    describe('column', () => {
      const arbitraryRowIndex = 1;

      it('sets which column to get the value from', () => {
        expect(fn(testTable, { column: 'price', row: arbitraryRowIndex })).to.be(
          testTable.rows[arbitraryRowIndex].price
        );
      });

      it('defaults to first column if not provided', () => {
        expect(fn(testTable, { row: arbitraryRowIndex })).to.be(
          testTable.rows[arbitraryRowIndex][firstColumn]
        );
      });

      it('throws when invalid column is provided', () => {
        expect(() => fn(testTable, { column: 'foo' })).to.throwException(
          new RegExp(errors.columnNotFound('foo').message)
        );
      });
    });

    describe('row', () => {
      it('sets which row to get the value from', () => {
        const arbitraryRowIndex = 8;

        expect(fn(testTable, { column: 'in_stock', row: arbitraryRowIndex })).to.eql(
          testTable.rows[arbitraryRowIndex].in_stock
        );
      });

      it('defaults to first row if not specified', () => {
        expect(fn(testTable, { column: 'name' })).to.eql(testTable.rows[0].name);
      });

      it('throws when row does not exist', () => {
        const invalidRow = testTable.rows.length;

        expect(() => fn(testTable, { column: 'name', row: invalidRow })).to.throwException(
          new RegExp(errors.rowNotFound(invalidRow).message)
        );

        expect(() => fn(emptyTable, { column: 'foo' })).to.throwException(
          new RegExp(errors.rowNotFound(0).message)
        );

        expect(() => fn(emptyTable)).to.throwException(new RegExp(errors.rowNotFound(0).message));
      });
    });
  });
});
