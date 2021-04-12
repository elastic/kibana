/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Datatable } from 'src/plugins/expressions/public';
import { getSliceValue, getFilterContext } from './render_helpers';

describe('render helpers', () => {
  describe('#getSliceValue', () => {
    it('returns the metric when positive number', () => {
      expect(
        getSliceValue(
          { a: 'Cat', b: 'Home', c: 5 },
          {
            id: 'c',
            name: 'C',
            meta: { type: 'number' },
          }
        )
      ).toEqual(5);
    });

    it('returns the metric when negative number', () => {
      expect(
        getSliceValue(
          { a: 'Cat', b: 'Home', c: -100 },
          {
            id: 'c',
            name: 'C',
            meta: { type: 'number' },
          }
        )
      ).toEqual(-100);
    });

    it('returns epsilon when metric is 0 without fallback', () => {
      expect(
        getSliceValue(
          { a: 'Cat', b: 'Home', c: 0 },
          {
            id: 'c',
            name: 'C',
            meta: { type: 'number' },
          }
        )
      ).toEqual(Number.EPSILON);
    });
  });

  describe('#getFilterContext', () => {
    it('handles single slice click for single ring', () => {
      const table: Datatable = {
        type: 'datatable',
        columns: [
          { id: 'a', name: 'A', meta: { type: 'string' } },
          { id: 'b', name: 'B', meta: { type: 'number' } },
        ],
        rows: [
          { a: 'Hi', b: 2 },
          { a: 'Test', b: 4 },
          { a: 'Foo', b: 6 },
        ],
      };
      expect(
        getFilterContext(
          [{ groupByRollup: 'Test', value: 100, depth: 1, path: [], sortIndex: 1 }],
          ['a'],
          table
        )
      ).toEqual({
        data: [
          {
            row: 1,
            column: 0,
            value: 'Test',
            table,
          },
        ],
      });
    });

    it('handles single slice click with 2 rings', () => {
      const table: Datatable = {
        type: 'datatable',
        columns: [
          { id: 'a', name: 'A', meta: { type: 'string' } },
          { id: 'b', name: 'B', meta: { type: 'string' } },
          { id: 'c', name: 'C', meta: { type: 'number' } },
        ],
        rows: [
          { a: 'Hi', b: 'Two', c: 2 },
          { a: 'Test', b: 'Two', c: 5 },
          { a: 'Foo', b: 'Three', c: 6 },
        ],
      };
      expect(
        getFilterContext(
          [{ groupByRollup: 'Test', value: 100, depth: 1, path: [], sortIndex: 1 }],
          ['a', 'b'],
          table
        )
      ).toEqual({
        data: [
          {
            row: 1,
            column: 0,
            value: 'Test',
            table,
          },
        ],
      });
    });

    it('finds right row for multi slice click', () => {
      const table: Datatable = {
        type: 'datatable',
        columns: [
          { id: 'a', name: 'A', meta: { type: 'string' } },
          { id: 'b', name: 'B', meta: { type: 'string' } },
          { id: 'c', name: 'C', meta: { type: 'number' } },
        ],
        rows: [
          { a: 'Hi', b: 'Two', c: 2 },
          { a: 'Test', b: 'Two', c: 5 },
          { a: 'Foo', b: 'Three', c: 6 },
        ],
      };
      expect(
        getFilterContext(
          [
            { groupByRollup: 'Test', value: 100, depth: 1, path: [], sortIndex: 1 },
            { groupByRollup: 'Two', value: 5, depth: 1, path: [], sortIndex: 1 },
          ],
          ['a', 'b'],
          table
        )
      ).toEqual({
        data: [
          {
            row: 1,
            column: 0,
            value: 'Test',
            table,
          },
          {
            row: 1,
            column: 1,
            value: 'Two',
            table,
          },
        ],
      });
    });
  });
});
