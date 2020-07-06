/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaDatatable } from 'src/plugins/expressions/public';
import { getSliceValueWithFallback, getFilterContext } from './render_helpers';

describe('render helpers', () => {
  describe('#getSliceValueWithFallback', () => {
    describe('without fallback', () => {
      const columnGroups = [
        { col: { id: 'a', name: 'A' }, metrics: [] },
        { col: { id: 'b', name: 'C' }, metrics: [] },
      ];

      it('returns the metric when positive number', () => {
        expect(
          getSliceValueWithFallback({ a: 'Cat', b: 'Home', c: 5 }, columnGroups, {
            id: 'c',
            name: 'C',
          })
        ).toEqual(5);
      });

      it('returns the metric when negative number', () => {
        expect(
          getSliceValueWithFallback({ a: 'Cat', b: 'Home', c: -100 }, columnGroups, {
            id: 'c',
            name: 'C',
          })
        ).toEqual(-100);
      });

      it('returns epsilon when metric is 0 without fallback', () => {
        expect(
          getSliceValueWithFallback({ a: 'Cat', b: 'Home', c: 0 }, columnGroups, {
            id: 'c',
            name: 'C',
          })
        ).toEqual(Number.EPSILON);
      });
    });

    describe('fallback behavior', () => {
      const columnGroups = [
        { col: { id: 'a', name: 'A' }, metrics: [{ id: 'a_subtotal', name: '' }] },
        { col: { id: 'b', name: 'C' }, metrics: [] },
      ];

      it('falls back to metric from previous column if available', () => {
        expect(
          getSliceValueWithFallback(
            { a: 'Cat', a_subtotal: 5, b: 'Home', c: undefined },
            columnGroups,
            { id: 'c', name: 'C' }
          )
        ).toEqual(5);
      });

      it('uses epsilon if fallback is 0', () => {
        expect(
          getSliceValueWithFallback(
            { a: 'Cat', a_subtotal: 0, b: 'Home', c: undefined },
            columnGroups,
            { id: 'c', name: 'C' }
          )
        ).toEqual(Number.EPSILON);
      });

      it('uses epsilon if fallback is missing', () => {
        expect(
          getSliceValueWithFallback(
            { a: 'Cat', a_subtotal: undefined, b: 'Home', c: undefined },
            columnGroups,
            { id: 'c', name: 'C' }
          )
        ).toEqual(Number.EPSILON);
      });
    });
  });

  describe('#getFilterContext', () => {
    it('handles single slice click for single ring', () => {
      const table: KibanaDatatable = {
        type: 'kibana_datatable',
        columns: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
        ],
        rows: [
          { a: 'Hi', b: 2 },
          { a: 'Test', b: 4 },
          { a: 'Foo', b: 6 },
        ],
      };
      expect(getFilterContext([{ groupByRollup: 'Test', value: 100 }], ['a'], table)).toEqual({
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
      const table: KibanaDatatable = {
        type: 'kibana_datatable',
        columns: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
          { id: 'c', name: 'C' },
        ],
        rows: [
          { a: 'Hi', b: 'Two', c: 2 },
          { a: 'Test', b: 'Two', c: 5 },
          { a: 'Foo', b: 'Three', c: 6 },
        ],
      };
      expect(getFilterContext([{ groupByRollup: 'Test', value: 100 }], ['a', 'b'], table)).toEqual({
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
      const table: KibanaDatatable = {
        type: 'kibana_datatable',
        columns: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
          { id: 'c', name: 'C' },
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
            { groupByRollup: 'Test', value: 100 },
            { groupByRollup: 'Two', value: 5 },
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
