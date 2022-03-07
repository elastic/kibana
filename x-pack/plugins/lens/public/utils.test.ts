/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Datatable } from 'src/plugins/expressions/public';
import { inferTimeField } from './utils';

const table: Datatable = {
  type: 'datatable',
  rows: [],
  columns: [
    {
      id: '1',
      name: '',
      meta: {
        type: 'date',
        field: 'abc',
        source: 'esaggs',
        sourceParams: {
          type: 'date_histogram',
          params: {},
          appliedTimeRange: {
            from: '2021-01-01',
            to: '2022-01-01',
          },
        },
      },
    },
  ],
};

const tableWithoutAppliedTimeRange = {
  ...table,
  columns: [
    {
      ...table.columns[0],
      meta: {
        ...table.columns[0].meta,
        sourceParams: {
          ...table.columns[0].meta.sourceParams,
          appliedTimeRange: undefined,
        },
      },
    },
  ],
};

describe('utils', () => {
  describe('inferTimeField', () => {
    test('infer time field for brush event', () => {
      expect(
        inferTimeField({
          table,
          column: 0,
          range: [1, 2],
        })
      ).toEqual('abc');
    });

    test('do not return time field if time range is not bound', () => {
      expect(
        inferTimeField({
          table: tableWithoutAppliedTimeRange,
          column: 0,
          range: [1, 2],
        })
      ).toEqual(undefined);
    });

    test('infer time field for click event', () => {
      expect(
        inferTimeField({
          data: [
            {
              table,
              column: 0,
              row: 0,
              value: 1,
            },
          ],
        })
      ).toEqual('abc');
    });

    test('do not return time field for negated click event', () => {
      expect(
        inferTimeField({
          data: [
            {
              table,
              column: 0,
              row: 0,
              value: 1,
            },
          ],
          negate: true,
        })
      ).toEqual(undefined);
    });

    test('do not return time field for click event without bound time field', () => {
      expect(
        inferTimeField({
          data: [
            {
              table: tableWithoutAppliedTimeRange,
              column: 0,
              row: 0,
              value: 1,
            },
          ],
        })
      ).toEqual(undefined);
    });
  });
});
