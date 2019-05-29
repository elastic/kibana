/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { alterColumn } from '../alterColumn';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { getFunctionErrors } from '../../../strings';
import { emptyTable, testTable } from './fixtures/test_tables';

const errors = getFunctionErrors().alterColumn;

describe('alterColumn', () => {
  const fn = functionWrapper(alterColumn);
  const nameColumnIndex = testTable.columns.findIndex(({ name }) => name === 'name');
  const timeColumnIndex = testTable.columns.findIndex(({ name }) => name === 'time');
  const priceColumnIndex = testTable.columns.findIndex(({ name }) => name === 'price');
  const inStockColumnIndex = testTable.columns.findIndex(({ name }) => name === 'in_stock');

  it('returns a datatable', () => {
    const alteredTable = fn(testTable, { column: 'price', type: 'string', name: 'priceString' });

    expect(alteredTable.type).to.be('datatable');
  });

  describe('args', () => {
    it('returns original context if no args are provided', () => {
      expect(fn(testTable)).to.eql(testTable);
    });

    describe('column', () => {
      // ISO 8601 string -> date
      it('specifies which column to alter', () => {
        const dateToString = fn(testTable, { column: 'time', type: 'string', name: 'timeISO' });
        const originalColumn = testTable.columns[timeColumnIndex];
        const newColumn = dateToString.columns[timeColumnIndex];
        const arbitraryRowIndex = 6;

        expect(newColumn.name).to.not.be(originalColumn.name);
        expect(newColumn.type).to.not.be(originalColumn.type);
        expect(dateToString.rows[arbitraryRowIndex].timeISO).to.be.a('string');
        expect(new Date(dateToString.rows[arbitraryRowIndex].timeISO)).to.eql(
          new Date(testTable.rows[arbitraryRowIndex].time)
        );
      });

      it('returns original context if column is not specified', () => {
        expect(fn(testTable, { type: 'date', name: 'timeISO' })).to.eql(testTable);
      });

      it('throws if column does not exists', () => {
        expect(() => fn(emptyTable, { column: 'foo', type: 'number' })).to.throwException(
          new RegExp(errors.columnNotFound('foo').message)
        );
      });
    });

    describe('type', () => {
      it('converts the column to the specified type', () => {
        const dateToString = fn(testTable, { column: 'time', type: 'string', name: 'timeISO' });

        expect(dateToString.columns[timeColumnIndex].type).to.be('string');
        expect(dateToString.rows[timeColumnIndex].timeISO).to.be.a('string');
        expect(new Date(dateToString.rows[timeColumnIndex].timeISO)).to.eql(
          new Date(testTable.rows[timeColumnIndex].time)
        );
      });

      it('does not change column if type is not specified', () => {
        const unconvertedColumn = fn(testTable, { column: 'price', name: 'foo' });
        const originalType = testTable.columns[priceColumnIndex].type;
        const arbitraryRowIndex = 2;

        expect(unconvertedColumn.columns[priceColumnIndex].type).to.be(originalType);
        expect(unconvertedColumn.rows[arbitraryRowIndex].foo).to.be.a(
          originalType,
          testTable.rows[arbitraryRowIndex].price
        );
      });

      it('throws when converting to an invalid type', () => {
        expect(() => fn(testTable, { column: 'name', type: 'foo' })).to.throwException(
          new RegExp(errors.cannotConvertType('foo').message)
        );
      });
    });

    describe('name', () => {
      it('changes column name to specified name', () => {
        const dateToString = fn(testTable, { column: 'time', type: 'date', name: 'timeISO' });
        const arbitraryRowIndex = 8;

        expect(dateToString.columns[timeColumnIndex].name).to.be('timeISO');
        expect(dateToString.rows[arbitraryRowIndex]).to.have.property('timeISO');
      });

      it('overwrites existing column if provided an existing column name', () => {
        const overwriteName = fn(testTable, { column: 'time', type: 'string', name: 'name' });
        const originalColumn = testTable.columns[timeColumnIndex];
        const newColumn = overwriteName.columns[nameColumnIndex];
        const arbitraryRowIndex = 5;

        expect(newColumn.name).to.not.be(originalColumn.name);
        expect(newColumn.type).to.not.be(originalColumn.type);
        expect(overwriteName.rows[arbitraryRowIndex].name).to.be.a('string');
        expect(new Date(overwriteName.rows[arbitraryRowIndex].name)).to.eql(
          new Date(testTable.rows[arbitraryRowIndex].time)
        );
      });

      it('retains original column name if name is not provided', () => {
        const unchangedName = fn(testTable, { column: 'price', type: 'string' });

        expect(unchangedName.columns[priceColumnIndex].name).to.be(
          testTable.columns[priceColumnIndex].name
        );
      });
    });
  });

  describe('valid type conversions', () => {
    it('converts number <-> string', () => {
      const arbitraryRowIndex = 4;
      const numberToString = fn(testTable, { column: 'price', type: 'string' });

      expect(numberToString.columns[priceColumnIndex])
        .to.have.property('name', 'price')
        .and.to.have.property('type', 'string');
      expect(numberToString.rows[arbitraryRowIndex].price)
        .to.be.a('string')
        .and.to.eql(testTable.rows[arbitraryRowIndex].price);

      const stringToNumber = fn(numberToString, { column: 'price', type: 'number' });

      expect(stringToNumber.columns[priceColumnIndex])
        .to.have.property('name', 'price')
        .and.to.have.property('type', 'number');
      expect(stringToNumber.rows[arbitraryRowIndex].price)
        .to.be.a('number')
        .and.to.eql(numberToString.rows[arbitraryRowIndex].price);
    });

    it('converts date <-> string', () => {
      const arbitraryRowIndex = 4;
      const dateToString = fn(testTable, { column: 'time', type: 'string' });

      expect(dateToString.columns[timeColumnIndex])
        .to.have.property('name', 'time')
        .and.to.have.property('type', 'string');
      expect(dateToString.rows[arbitraryRowIndex].time).to.be.a('string');
      expect(new Date(dateToString.rows[arbitraryRowIndex].time)).to.eql(
        new Date(testTable.rows[arbitraryRowIndex].time)
      );

      const stringToDate = fn(dateToString, { column: 'time', type: 'date' });

      expect(stringToDate.columns[timeColumnIndex])
        .to.have.property('name', 'time')
        .and.to.have.property('type', 'date');
      expect(new Date(stringToDate.rows[timeColumnIndex].time))
        .to.be.a(Date)
        .and.to.eql(new Date(dateToString.rows[timeColumnIndex].time));
    });

    it('converts date <-> number', () => {
      const dateToNumber = fn(testTable, { column: 'time', type: 'number' });
      const arbitraryRowIndex = 1;

      expect(dateToNumber.columns[timeColumnIndex])
        .to.have.property('name', 'time')
        .and.to.have.property('type', 'number');
      expect(dateToNumber.rows[arbitraryRowIndex].time)
        .to.be.a('number')
        .and.to.eql(testTable.rows[arbitraryRowIndex].time);

      const numberToDate = fn(dateToNumber, { column: 'time', type: 'date' });

      expect(numberToDate.columns[timeColumnIndex])
        .to.have.property('name', 'time')
        .and.to.have.property('type', 'date');
      expect(new Date(numberToDate.rows[arbitraryRowIndex].time))
        .to.be.a(Date)
        .and.to.eql(testTable.rows[arbitraryRowIndex].time);
    });

    it('converts bool <-> number', () => {
      const booleanToNumber = fn(testTable, { column: 'in_stock', type: 'number' });
      const arbitraryRowIndex = 7;

      expect(booleanToNumber.columns[inStockColumnIndex])
        .to.have.property('name', 'in_stock')
        .and.to.have.property('type', 'number');
      expect(booleanToNumber.rows[arbitraryRowIndex].in_stock)
        .to.be.a('number')
        .and.to.eql(booleanToNumber.rows[arbitraryRowIndex].in_stock);

      const numberToBoolean = fn(booleanToNumber, { column: 'in_stock', type: 'boolean' });

      expect(numberToBoolean.columns[inStockColumnIndex])
        .to.have.property('name', 'in_stock')
        .and.to.have.property('type', 'boolean');
      expect(numberToBoolean.rows[arbitraryRowIndex].in_stock)
        .to.be.a('boolean')
        .and.to.eql(numberToBoolean.rows[arbitraryRowIndex].in_stock);
    });

    it('converts any type -> null', () => {
      const stringToNull = fn(testTable, { column: 'name', type: 'null' });
      const arbitraryRowIndex = 0;

      expect(stringToNull.columns[nameColumnIndex])
        .to.have.property('name', 'name')
        .and.to.have.property('type', 'null');
      expect(stringToNull.rows[arbitraryRowIndex].name).to.be(null);
    });
  });
});
