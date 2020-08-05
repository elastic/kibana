/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functionWrapper } from '../../../__tests__/helpers/function_wrapper';
import { getFunctionErrors } from '../../../i18n';
import { emptyTable, testTable } from './__tests__/fixtures/test_tables';
import { alterColumn } from './alterColumn';

const errors = getFunctionErrors().alterColumn;

describe('alterColumn', () => {
  const fn = functionWrapper(alterColumn);
  const nameColumnIndex = testTable.columns.findIndex(({ name }) => name === 'name');
  const timeColumnIndex = testTable.columns.findIndex(({ name }) => name === 'time');
  const priceColumnIndex = testTable.columns.findIndex(({ name }) => name === 'price');
  const inStockColumnIndex = testTable.columns.findIndex(({ name }) => name === 'in_stock');

  it('returns a datatable', () => {
    const alteredTable = fn(testTable, { column: 'price', type: 'string', name: 'priceString' });

    expect(alteredTable.type).toBe('datatable');
  });

  describe('args', () => {
    it('returns original context if no args are provided', () => {
      expect(fn(testTable)).toEqual(testTable);
    });

    describe('column', () => {
      // ISO 8601 string -> date
      it('specifies which column to alter', () => {
        const dateToString = fn(testTable, { column: 'time', type: 'string', name: 'timeISO' });
        const originalColumn = testTable.columns[timeColumnIndex];
        const newColumn = dateToString.columns[timeColumnIndex];
        const arbitraryRowIndex = 6;

        expect(newColumn.name).not.toBe(originalColumn.name);
        expect(newColumn.type).not.toBe(originalColumn.type);
        expect(typeof dateToString.rows[arbitraryRowIndex].timeISO).toBe('string');
        expect(new Date(dateToString.rows[arbitraryRowIndex].timeISO)).toEqual(
          new Date(testTable.rows[arbitraryRowIndex].time)
        );
      });

      it('returns original context if column is not specified', () => {
        expect(fn(testTable, { type: 'date', name: 'timeISO' })).toBe(testTable);
      });

      it('throws if column does not exists', () => {
        expect(() => fn(emptyTable, { column: 'foo', type: 'number' })).toThrow(
          new RegExp(errors.columnNotFound('foo').message)
        );
      });
    });

    describe('type', () => {
      it('converts the column to the specified type', () => {
        const dateToString = fn(testTable, { column: 'time', type: 'string', name: 'timeISO' });

        expect(typeof dateToString.columns[timeColumnIndex].type).toBe('string');
        expect(typeof dateToString.rows[timeColumnIndex].timeISO).toBe('string');
        expect(new Date(dateToString.rows[timeColumnIndex].timeISO)).toEqual(
          new Date(testTable.rows[timeColumnIndex].time)
        );
      });

      it('does not change column if type is not specified', () => {
        const unconvertedColumn = fn(testTable, { column: 'price', name: 'foo' });
        const originalType = testTable.columns[priceColumnIndex].type;
        const arbitraryRowIndex = 2;

        expect(unconvertedColumn.columns[priceColumnIndex].type).toBe(originalType);
        expect(typeof unconvertedColumn.rows[arbitraryRowIndex].foo).toBe(originalType);
      });

      it('throws when converting to an invalid type', () => {
        expect(() => fn(testTable, { column: 'name', type: 'foo' })).toThrow(
          new RegExp(errors.cannotConvertType('foo').message)
        );
      });
    });

    describe('name', () => {
      it('changes column name to specified name', () => {
        const dateToString = fn(testTable, { column: 'time', type: 'date', name: 'timeISO' });
        const arbitraryRowIndex = 8;

        expect(dateToString.columns[timeColumnIndex].name).toBe('timeISO');
        expect(dateToString.rows[arbitraryRowIndex]).toHaveProperty('timeISO');
      });

      it('overwrites existing column if provided an existing column name', () => {
        const overwriteName = fn(testTable, { column: 'time', type: 'string', name: 'name' });
        const originalColumn = testTable.columns[timeColumnIndex];
        const newColumn = overwriteName.columns[nameColumnIndex];
        const arbitraryRowIndex = 5;

        expect(newColumn.name).not.toBe(originalColumn.name);
        expect(newColumn.type).not.toBe(originalColumn.type);
        expect(typeof overwriteName.rows[arbitraryRowIndex].name).toBe('string');
        expect(new Date(overwriteName.rows[arbitraryRowIndex].name)).toEqual(
          new Date(testTable.rows[arbitraryRowIndex].time)
        );
      });

      it('retains original column name if name is not provided', () => {
        const unchangedName = fn(testTable, { column: 'price', type: 'string' });

        expect(unchangedName.columns[priceColumnIndex].name).toBe(
          testTable.columns[priceColumnIndex].name
        );
      });
    });
  });

  describe('valid type conversions', () => {
    it('converts number <-> string', () => {
      const arbitraryRowIndex = 4;
      const numberToString = fn(testTable, { column: 'price', type: 'string' });

      expect(numberToString.columns[priceColumnIndex]).toHaveProperty('name', 'price');
      expect(numberToString.columns[priceColumnIndex]).toHaveProperty('type', 'string');

      expect(typeof numberToString.rows[arbitraryRowIndex].price).toBe('string');
      expect(numberToString.rows[arbitraryRowIndex].price).toBe(
        `${testTable.rows[arbitraryRowIndex].price}`
      );

      const stringToNumber = fn(numberToString, { column: 'price', type: 'number' });

      expect(stringToNumber.columns[priceColumnIndex]).toHaveProperty('name', 'price');
      expect(stringToNumber.columns[priceColumnIndex]).toHaveProperty('type', 'number');

      expect(typeof stringToNumber.rows[arbitraryRowIndex].price).toBe('number');

      expect(stringToNumber.rows[arbitraryRowIndex].price).toEqual(
        parseFloat(numberToString.rows[arbitraryRowIndex].price)
      );
    });

    it('converts date <-> string', () => {
      const arbitraryRowIndex = 4;
      const dateToString = fn(testTable, { column: 'time', type: 'string' });

      expect(dateToString.columns[timeColumnIndex]).toHaveProperty('name', 'time');
      expect(dateToString.columns[timeColumnIndex]).toHaveProperty('type', 'string');

      expect(typeof dateToString.rows[arbitraryRowIndex].time).toBe('string');
      expect(new Date(dateToString.rows[arbitraryRowIndex].time)).toEqual(
        new Date(testTable.rows[arbitraryRowIndex].time)
      );

      const stringToDate = fn(dateToString, { column: 'time', type: 'date' });

      expect(stringToDate.columns[timeColumnIndex]).toHaveProperty('name', 'time');
      expect(stringToDate.columns[timeColumnIndex]).toHaveProperty('type', 'date');
      expect(new Date(stringToDate.rows[timeColumnIndex].time)).toBeInstanceOf(Date);

      expect(new Date(stringToDate.rows[timeColumnIndex].time)).toEqual(
        new Date(dateToString.rows[timeColumnIndex].time)
      );
    });

    it('converts date <-> number', () => {
      const dateToNumber = fn(testTable, { column: 'time', type: 'number' });
      const arbitraryRowIndex = 1;

      expect(dateToNumber.columns[timeColumnIndex]).toHaveProperty('name', 'time');
      expect(dateToNumber.columns[timeColumnIndex]).toHaveProperty('type', 'number');

      expect(typeof dateToNumber.rows[arbitraryRowIndex].time).toBe('number');
      expect(dateToNumber.rows[arbitraryRowIndex].time).toEqual(
        testTable.rows[arbitraryRowIndex].time
      );

      const numberToDate = fn(dateToNumber, { column: 'time', type: 'date' });

      expect(numberToDate.columns[timeColumnIndex]).toHaveProperty('name', 'time');
      expect(numberToDate.columns[timeColumnIndex]).toHaveProperty('type', 'date');

      expect(new Date(numberToDate.rows[arbitraryRowIndex].time)).toBeInstanceOf(Date);
      expect(new Date(numberToDate.rows[arbitraryRowIndex].time)).toEqual(
        new Date(testTable.rows[arbitraryRowIndex].time)
      );
    });

    it('converts bool <-> number', () => {
      const booleanToNumber = fn(testTable, { column: 'in_stock', type: 'number' });
      const arbitraryRowIndex = 7;

      expect(booleanToNumber.columns[inStockColumnIndex]).toHaveProperty('name', 'in_stock');
      expect(booleanToNumber.columns[inStockColumnIndex]).toHaveProperty('type', 'number');

      expect(typeof booleanToNumber.rows[arbitraryRowIndex].in_stock).toBe('number');
      expect(booleanToNumber.rows[arbitraryRowIndex].in_stock).toEqual(
        booleanToNumber.rows[arbitraryRowIndex].in_stock
      );

      const numberToBoolean = fn(booleanToNumber, { column: 'in_stock', type: 'boolean' });

      expect(numberToBoolean.columns[inStockColumnIndex]).toHaveProperty('name', 'in_stock');
      expect(numberToBoolean.columns[inStockColumnIndex]).toHaveProperty('type', 'boolean');

      expect(typeof numberToBoolean.rows[arbitraryRowIndex].in_stock).toBe('boolean');
      expect(numberToBoolean.rows[arbitraryRowIndex].in_stock).toEqual(
        numberToBoolean.rows[arbitraryRowIndex].in_stock
      );
    });

    it('converts any type -> null', () => {
      const stringToNull = fn(testTable, { column: 'name', type: 'null' });
      const arbitraryRowIndex = 0;

      expect(stringToNull.columns[nameColumnIndex]).toHaveProperty('name', 'name');

      expect(stringToNull.columns[nameColumnIndex]).toHaveProperty('type', 'null');

      expect(stringToNull.rows[arbitraryRowIndex].name).toBe(null);
    });
  });
});
