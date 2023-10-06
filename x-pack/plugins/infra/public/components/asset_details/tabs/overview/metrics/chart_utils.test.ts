/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common/expression_types';
import {
  calculateChartRowsTimeInterval,
  extractRangeFromChartFilterEvent,
  extractTableEntryFromChartClickContextData,
  isChartClickContextData,
} from './chart_utils';

describe('Asset details chart utils', () => {
  describe('isChartClickContextData() type guard', () => {
    it('returns false in case data does not match expected schema', () => {
      expect(isChartClickContextData(undefined)).toEqual(false);
      expect(isChartClickContextData({})).toEqual(false);
      expect(isChartClickContextData([{}])).toEqual(false);
      expect(isChartClickContextData([])).toEqual(false);
      expect(isChartClickContextData([{ cells: [] }])).toEqual(false);
    });

    it('returns true when data array contains a cells sub-array with at least one item', () => {
      expect(isChartClickContextData([{ cells: [{ row: 0, column: 1 }] }])).toEqual(true);
    });
  });

  describe('calculateChartRowsTimeInterval()', () => {
    it('returns 0 in case there is less then 2 rows', () => {
      expect(calculateChartRowsTimeInterval([], 'timeColumn')).toEqual(0);
      expect(calculateChartRowsTimeInterval([{ timeColumn: 1694178000000 }], 'timeColumn')).toEqual(
        0
      );
    });

    it('returns time difference between rows', () => {
      expect(calculateChartRowsTimeInterval([], 'timeColumn')).toEqual(0);
      expect(
        calculateChartRowsTimeInterval(
          [{ timeColumn: 1694178000000 }, { timeColumn: 1694178100000 }],
          'timeColumn'
        )
      ).toEqual(100000);
    });

    it('returns positive time difference between rows in case rows are not in chronological order', () => {
      expect(calculateChartRowsTimeInterval([], 'timeColumn')).toEqual(0);
      expect(
        calculateChartRowsTimeInterval(
          [{ timeColumn: 1694178100000 }, { timeColumn: 1694178000000 }],
          'timeColumn'
        )
      ).toEqual(100000);
    });
  });

  describe('extractTableEntryFromChartClickContextData()', () => {
    it('returns null for a row in case row index in `cells` does not exists in the `table`', () => {
      const row: DatatableRow = { timeColumn: 1694178026935 };
      const column: DatatableColumn = {
        id: 'timeColumn',
        name: '@timestamp',
        meta: { type: 'date' },
      };

      expect(
        extractTableEntryFromChartClickContextData([
          {
            cells: [{ row: 1, column: 0 }],
            table: {
              rows: [row],
              columns: [column],
            },
          },
        ])
      ).toEqual({ row: null, column });
    });

    it('returns null for a column in case column index in `cells` does not exists in the `table`', () => {
      const row: DatatableRow = { timeColumn: 1694178026935 };
      const column: DatatableColumn = {
        id: 'timeColumn',
        name: '@timestamp',
        meta: { type: 'date' },
      };

      expect(
        extractTableEntryFromChartClickContextData([
          {
            cells: [{ row: 0, column: 1 }],
            table: {
              rows: [row],
              columns: [column],
            },
          },
        ])
      ).toEqual({ row, column: null });
    });

    it('returns row and column that match indexes from `cells`', () => {
      const row: DatatableRow = { timeColumn: 1694178026935 };
      const column: DatatableColumn = {
        id: 'timeColumn',
        name: '@timestamp',
        meta: { type: 'date' },
      };

      expect(
        extractTableEntryFromChartClickContextData([
          {
            cells: [{ row: 0, column: 0 }],
            table: {
              rows: [row],
              columns: [column],
            },
          },
        ])
      ).toEqual({ row, column });
    });
  });

  describe('extractRangeFromChartFilterEvent()', () => {
    it('returns null if event does not have the time filter data', () => {
      expect(
        extractRangeFromChartFilterEvent({
          data: [{ cells: [], table: { rows: [], columns: [] } }],
          preventDefault: () => {},
        })
      ).toEqual(null);
    });

    it('returns TimeRange with `from` equal to the date user is filtering by', () => {
      const timestamp = 1694178026935;
      const row: DatatableRow = { timeColumn: timestamp };
      const column: DatatableColumn = {
        id: 'timeColumn',
        name: '@timestamp',
        meta: { type: 'date' },
      };

      const range = extractRangeFromChartFilterEvent({
        data: [
          {
            cells: [{ row: 0, column: 0 }],
            table: {
              rows: [row],
              columns: [column],
            },
          },
        ],
        preventDefault: () => {},
      });

      expect(range?.from).toEqual(new Date(timestamp).toISOString());
    });

    it('returns TimeRange with `to` equal to the date user is filtering by plus the time to next data point', () => {
      const timestamp0 = 1694178000000;
      const timestamp1 = 1694178100000;
      const interval = timestamp1 - timestamp0;

      const range = extractRangeFromChartFilterEvent({
        data: [
          {
            cells: [{ row: 0, column: 0 }],
            table: {
              rows: [{ timeColumn: timestamp0 }, { timeColumn: timestamp1 }],
              columns: [
                {
                  id: 'timeColumn',
                  name: '@timestamp',
                  meta: { type: 'date' },
                },
              ],
            },
          },
        ],
        preventDefault: () => {},
      });

      expect(range?.to).toEqual(new Date(timestamp0 + interval).toISOString());
    });
  });
});
