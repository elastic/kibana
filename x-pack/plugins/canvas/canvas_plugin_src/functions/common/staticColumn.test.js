/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { functionWrapper } from '../../../../../../src/plugins/presentation_util/common/lib';
import { getFunctionErrors } from '../../../i18n';
import { testTable, emptyTable } from './__fixtures__/test_tables';
import { staticColumn } from './staticColumn';

const errors = getFunctionErrors().staticColumn;

describe('staticColumn', () => {
  const fn = functionWrapper(staticColumn);

  it("adds a column to a datatable with a static value in every row if column with such a name doesn't exist", () => {
    const result = fn(testTable, { name: 'foo', value: 'bar' });

    expect(result.type).toBe('datatable');
    expect(result.columns).toEqual([
      ...testTable.columns,
      { id: 'foo', name: 'foo', meta: { type: 'string' } },
    ]);
    expect(result.rows.every((row) => typeof row.foo === 'string')).toBe(true);
    expect(result.rows.every((row) => row.foo === 'bar')).toBe(true);
  });

  it('updates an existing column if provided an existing column name', () => {
    const name = 'name';
    const value = 500;
    const result = fn(testTable, { name, value });

    expect(result.type).toBe('datatable');
    const foundColumn = result.columns.find((column) => column.name === name);
    const originalColumn = testTable.columns.find((column) => column.name === name);

    expect(foundColumn).not.toBeUndefined();
    expect(originalColumn).not.toBeUndefined();

    expect(foundColumn.meta).toEqual({
      ...originalColumn.meta,
      type: 'number',
      params: { ...originalColumn.meta.params, id: 'number' },
    });

    expect(result.rows.every((row) => typeof row.name === 'number')).toBe(true);
    expect(result.rows.every((row) => row.name === value)).toBe(true);
  });

  it('adds a column with null values', () => {
    const result = fn(testTable, { name: 'empty' });

    expect(result.type).toBe('datatable');
    expect(result.columns).toEqual([
      ...testTable.columns,
      { id: 'empty', name: 'empty', meta: { type: 'null' } },
    ]);
    expect(result.rows.every((row) => row.empty === null)).toBe(true);
  });

  it('adds a column to empty tables', () => {
    const result = fn(emptyTable, { name: 'empty', value: 1 });

    expect(result.type).toBe('datatable');
    expect(result.columns).toEqual([{ id: 'empty', name: 'empty', meta: { type: 'number' } }]);
    expect(result.rows.length).toBe(0);
  });

  it('updates the column by id', () => {
    const id = 'name';
    const value = 'Some new Value';
    const result = fn(testTable, { id, value });
    const foundColumn = result.columns.find((column) => column.id === id);
    const originalColumn = testTable.columns.find((column) => column.id === id);

    expect(foundColumn).not.toBeUndefined();
    expect(originalColumn).not.toBeUndefined();

    expect(foundColumn.meta).toEqual({
      ...originalColumn.meta,
      type: 'string',
      params: { ...originalColumn.meta.params, id: 'string' },
    });
    expect(foundColumn.name).toBe(originalColumn.name);

    expect(result.rows.every((row) => typeof row[id] === 'string')).toBe(true);
    expect(result.rows.every((row) => row[id] === value)).toBe(true);
  });

  it('updates the column by id and rewriters name if it is passed', () => {
    const id = 'name';
    const name = 'some new name';
    const value = 'Some new Value';
    const result = fn(testTable, { id, name, value });
    const foundColumn = result.columns.find((column) => column.id === id);
    const originalColumn = testTable.columns.find((column) => column.id === id);

    expect(foundColumn).not.toBeUndefined();
    expect(originalColumn).not.toBeUndefined();

    expect(foundColumn.meta).toEqual({
      ...originalColumn.meta,
      type: 'string',
      params: { ...originalColumn.meta.params, id: 'string' },
    });
    expect(foundColumn.name).toBe(name);

    expect(result.rows.every((row) => typeof row[id] === 'string')).toBe(true);
    expect(result.rows.every((row) => row[id] === value)).toBe(true);
  });

  it("adds a column to a datatable with a static value in every row if column with such id doesn't exist", () => {
    const id = 'some-id';
    const value = 'bar';
    const result = fn(testTable, { id, value });

    expect(result.type).toBe('datatable');
    expect(result.columns).toEqual([
      ...testTable.columns,
      { id, name: id, meta: { type: 'string' } },
    ]);
    expect(result.rows.every((row) => typeof row[id] === 'string')).toBe(true);
    expect(result.rows.every((row) => row[id] === value)).toBe(true);

    const name = 'Some new name';
    const result2 = fn(testTable, { id, value, name });

    expect(result2.type).toBe('datatable');
    expect(result2.columns).toEqual([...testTable.columns, { id, name, meta: { type: 'string' } }]);
    expect(result2.rows.every((row) => typeof row[id] === 'string')).toBe(true);
    expect(result2.rows.every((row) => row[id] === value)).toBe(true);
  });

  it('throws error if name and id are null or empty strings', () => {
    const value = '2323';
    const throwsError = (params) =>
      expect(() => {
        fn(testTable, params);
      }).toThrow(new RegExp(errors.invalidIdAndNameArguments().message));

    throwsError({ value, id: null });
    throwsError({ value, name: null });
    throwsError({ value, id: '' });
    throwsError({ value, name: '' });
    throwsError({ value, name: null, id: null });
    throwsError({ value, name: '', id: null });
    throwsError({ value, name: null, id: '' });
    throwsError({ value, name: '', id: '' });
  });
});
