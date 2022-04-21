/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatatableProps } from '../../common/expressions';
import type { LensMultiTable } from '../../common';
import { createMockExecutionContext } from '@kbn/expressions-plugin/common/mocks';
import type { FormatFactory } from '../../common';
import { getDatatable } from '../../common/expressions';

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
    columns: [
      {
        columnId: 'a',
        type: 'lens_datatable_column',
      },
      {
        columnId: 'b',
        type: 'lens_datatable_column',
      },
      {
        columnId: 'c',
        type: 'lens_datatable_column',
      },
    ],
    sortingColumnId: undefined,
    sortingDirection: 'none',
  };

  return { data, args };
}

describe('datatable_expression', () => {
  describe('datatable renders', () => {
    test('it renders with the specified data and args', async () => {
      const { data, args } = sampleArgs();
      const result = await getDatatable(() => Promise.resolve((() => {}) as FormatFactory)).fn(
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
