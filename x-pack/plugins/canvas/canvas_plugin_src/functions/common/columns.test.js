/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { functionWrapper } from '../../../../../../src/plugins/presentation_util/common/lib';
import { emptyTable, testTable } from './__fixtures__/test_tables';
import { columns } from './columns';

describe('columns', () => {
  const fn = functionWrapper(columns);

  it('returns a datatable', () => {
    expect(fn(testTable, { include: 'name' }).type).toBe('datatable');
  });

  describe('args', () => {
    it('returns a datatable with included columns and without excluded columns', () => {
      const arbitraryRowIndex = 7;
      const result = fn(testTable, {
        include: 'name, title_id, price, quantity, foo, bar',
        exclude: 'price, quantity, fizz, buzz',
      });

      expect(result.columns[0]).toHaveProperty('name', 'name');
      expect(result.columns[1]).toHaveProperty('id', 'title_id');
      expect(result.rows[arbitraryRowIndex]).toHaveProperty(
        'name',
        testTable.rows[arbitraryRowIndex].name
      );
      expect(result.rows[arbitraryRowIndex]).toHaveProperty(
        'title_id',
        testTable.rows[arbitraryRowIndex].title_id
      );
      expect(result.rows[arbitraryRowIndex]).not.toHaveProperty('price');
      expect(result.rows[arbitraryRowIndex]).not.toHaveProperty('quantity');
      expect(result.rows[arbitraryRowIndex]).not.toHaveProperty('foo');
      expect(result.rows[arbitraryRowIndex]).not.toHaveProperty('bar');
      expect(result.rows[arbitraryRowIndex]).not.toHaveProperty('fizz');
      expect(result.rows[arbitraryRowIndex]).not.toHaveProperty('buzz');
    });

    it('returns original context if args are not provided', () => {
      expect(fn(testTable)).toEqual(testTable);
    });

    it('returns an empty datatable if include and exclude both reference the same column(s)', () => {
      expect(fn(testTable, { include: 'price', exclude: 'price' })).toEqual(emptyTable);

      expect(
        fn(testTable, {
          include: 'price, quantity, in_stock, title_id',
          exclude: 'price, quantity, in_stock, title_id',
        })
      ).toEqual(emptyTable);
    });

    describe('include', () => {
      it('returns a datatable with included columns only', () => {
        const arbitraryRowIndex = 3;
        const result = fn(testTable, {
          include: 'name, time, in_stock, title_id',
        });

        expect(result.columns).toHaveLength(4);
        expect(Object.keys(result.rows[0])).toHaveLength(4);

        expect(result.columns[0]).toHaveProperty('name', 'name');
        expect(result.columns[1]).toHaveProperty('name', 'time');
        expect(result.columns[2]).toHaveProperty('name', 'in_stock');
        expect(result.columns[3]).toHaveProperty('id', 'title_id');

        expect(result.rows[arbitraryRowIndex]).toHaveProperty(
          'name',
          testTable.rows[arbitraryRowIndex].name
        );
        expect(result.rows[arbitraryRowIndex]).toHaveProperty(
          'time',
          testTable.rows[arbitraryRowIndex].time
        );
        expect(result.rows[arbitraryRowIndex]).toHaveProperty(
          'in_stock',
          testTable.rows[arbitraryRowIndex].in_stock
        );
        expect(result.rows[arbitraryRowIndex]).toHaveProperty(
          'title_id',
          testTable.rows[arbitraryRowIndex].title_id
        );
      });

      it('ignores invalid columns', () => {
        const arbitraryRowIndex = 6;
        const result = fn(testTable, {
          include: 'name, foo, bar',
        });

        expect(result.columns[0]).toHaveProperty('name', 'name');
        expect(result.rows[arbitraryRowIndex]).toHaveProperty(
          'name',
          testTable.rows[arbitraryRowIndex].name
        );
        expect(result.rows[arbitraryRowIndex]).not.toHaveProperty('foo');
        expect(result.rows[arbitraryRowIndex]).not.toHaveProperty('bar');
      });

      it('returns an empty datable if include only has invalid columns', () => {
        expect(fn(testTable, { include: 'foo, bar' })).toEqual(emptyTable);
      });
    });

    describe('exclude', () => {
      it('returns a datatable without excluded columns', () => {
        const arbitraryRowIndex = 5;
        const result = fn(testTable, { exclude: 'price, quantity, foo, bar, title_id' });

        expect(result.columns.length).toEqual(testTable.columns.length - 3);
        expect(Object.keys(result.rows[0])).toHaveLength(testTable.columns.length - 3);
        expect(result.rows[arbitraryRowIndex]).not.toHaveProperty('price');
        expect(result.rows[arbitraryRowIndex]).not.toHaveProperty('quantity');
        expect(result.rows[arbitraryRowIndex]).not.toHaveProperty('foo');
        expect(result.rows[arbitraryRowIndex]).not.toHaveProperty('bar');
        expect(result.rows[arbitraryRowIndex]).not.toHaveProperty('title_id');
      });

      it('ignores invalid columns', () => {
        const arbitraryRowIndex = 1;
        const result = fn(testTable, { exclude: 'time, foo, bar' });

        expect(result.columns.length).toEqual(testTable.columns.length - 1);
        expect(result.rows[arbitraryRowIndex]).not.toHaveProperty('time');
        expect(result.rows[arbitraryRowIndex]).not.toHaveProperty('foo');
        expect(result.rows[arbitraryRowIndex]).not.toHaveProperty('bar');
      });

      it('returns original context if exclude only references invalid column name(s)', () => {
        expect(fn(testTable, { exclude: 'foo, bar, fizz, buzz' })).toEqual(testTable);
      });
    });
  });
});
