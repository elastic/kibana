/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DatatableProps, getDatatable } from './expression';
import { LensMultiTable } from '../types';
import { createMockExecutionContext } from '../../../../../src/plugins/expressions/common/mocks';
import { IFieldFormat } from '../../../../../src/plugins/data/public';

function sampleArgs() {
  const indexPatternId = 'indexPatternId';
  const data: LensMultiTable = {
    type: 'lens_multitable',
    tables: {
      l1: {
        type: 'datatable',
        columns: [
          {
            id: 'a',
            name: 'a',
            meta: {
              type: 'string',
              source: 'esaggs',
              field: 'a',
              sourceParams: { type: 'terms', indexPatternId },
            },
          },
          {
            id: 'b',
            name: 'b',
            meta: {
              type: 'date',
              field: 'b',
              source: 'esaggs',
              sourceParams: {
                type: 'date_histogram',
                indexPatternId,
              },
            },
          },
          {
            id: 'c',
            name: 'c',
            meta: {
              type: 'number',
              source: 'esaggs',
              field: 'c',
              sourceParams: { indexPatternId, type: 'count' },
            },
          },
        ],
        rows: [{ a: 'shoes', b: 1588024800000, c: 3 }],
      },
    },
  };

  const args: DatatableProps['args'] = {
    title: 'My fanci metric chart',
    columns: {
      columnIds: ['a', 'b', 'c'],
      sortBy: '',
      sortDirection: 'none',
      type: 'lens_datatable_columns',
    },
  };

  return { data, args };
}

describe('datatable_expression', () => {
  describe('datatable renders', () => {
    test('it renders with the specified data and args', () => {
      const { data, args } = sampleArgs();
      const result = getDatatable({ formatFactory: (x) => x as IFieldFormat }).fn(
        data,
        args,
        createMockExecutionContext()
      );

      expect(result).toEqual({
        type: 'render',
        as: 'lens_datatable_renderer',
        value: { data, args },
      });
    });
  });
});
