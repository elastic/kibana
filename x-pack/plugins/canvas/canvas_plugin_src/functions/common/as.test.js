/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { functionWrapper } from '@kbn/presentation-util-plugin/common/lib';
import { asFn } from './as';

describe('as', () => {
  const fn = functionWrapper(asFn);

  it('returns a datatable with a single column and single row', () => {
    expect(fn('foo', { name: 'bar' })).toEqual({
      type: 'datatable',
      columns: [{ id: 'bar', name: 'bar', meta: { type: 'string' } }],
      rows: [{ bar: 'foo' }],
    });

    expect(fn(2, { name: 'num' })).toEqual({
      type: 'datatable',
      columns: [{ id: 'num', name: 'num', meta: { type: 'number' } }],
      rows: [{ num: 2 }],
    });

    expect(fn(true, { name: 'bool' })).toEqual({
      type: 'datatable',
      columns: [{ id: 'bool', name: 'bool', meta: { type: 'boolean' } }],
      rows: [{ bool: true }],
    });
  });

  describe('args', () => {
    describe('name', () => {
      it('sets the column name of the resulting datatable', () => {
        expect(fn(null, { name: 'foo' }).columns[0].name).toEqual('foo');
      });

      it("returns a datatable with the column name 'value'", () => {
        expect(fn(null).columns[0].name).toEqual('value');
      });
    });
  });
});
