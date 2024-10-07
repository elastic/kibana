/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createMockExecutionContext } from '@kbn/expressions-plugin/common/mocks';
import type { DatatableProps } from '../../../common/expressions';
import type { FormatFactory } from '../../../common/types';
import { getDatatable } from '../../../common/expressions';
import { getColumnCellValueActions, getColumnsFilterable } from './expression';
import type { Datatable, IInterpreterRenderHandlers } from '@kbn/expressions-plugin/common';
import { LensCellValueAction } from '../../types';

const cellValueAction: LensCellValueAction = {
  displayName: 'Test',
  id: 'test',
  iconType: 'test-icon',
  execute: () => {},
};
function sampleArgs(): DatatableProps {
  const indexPatternId = 'indexPatternId';
  const data: Datatable = {
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

  return { data, args, syncColors: false };
}

describe('datatable_expression', () => {
  describe('datatable renders', () => {
    test('it renders with the specified data and args', async () => {
      const { data, args, ...rest } = sampleArgs();
      const result = await getDatatable(() => Promise.resolve((() => {}) as FormatFactory)).fn(
        data,
        args,
        createMockExecutionContext()
      );

      expect(result).toEqual({
        type: 'render',
        as: 'lens_datatable_renderer',
        value: { data, args, ...rest },
      });
    });
  });

  describe('getColumnCellValueActions', () => {
    it('should return column cell value actions', async () => {
      const config = sampleArgs();
      const result = await getColumnCellValueActions(config, async () => [cellValueAction]);
      expect(result).toEqual([[cellValueAction], [cellValueAction], [cellValueAction]]);
    });

    it('should return empty actions if no data passed', async () => {
      const result = await getColumnCellValueActions(
        { data: null } as unknown as DatatableProps,
        async () => [cellValueAction]
      );
      expect(result).toEqual([]);
    });

    it('should return empty actions if no getCompatibleCellValueActions handler passed', async () => {
      const config = sampleArgs();
      const result = await getColumnCellValueActions(config, undefined);
      expect(result).toEqual([]);
    });
  });

  describe('getColumnsFilterable', () => {
    it('should return no data if an empty table is passed', async () => {
      const { data } = sampleArgs();
      data.rows = [];
      const hasCompatibleActions = jest.fn();
      expect(
        await getColumnsFilterable(data, {
          hasCompatibleActions,
        } as unknown as IInterpreterRenderHandlers)
      ).toBeUndefined();
      expect(hasCompatibleActions).not.toHaveBeenCalled();
    });

    it('should call the handler for each column', async () => {
      const { data } = sampleArgs();
      const hasCompatibleActions = jest.fn().mockResolvedValue(true);
      expect(
        await getColumnsFilterable(data, {
          hasCompatibleActions,
        } as unknown as IInterpreterRenderHandlers)
      ).toEqual([true, true, true]);
      expect(hasCompatibleActions).toHaveBeenCalledTimes(data.columns.length);
    });

    it('should call the handler for each column with table coords of data values', async () => {
      const { data } = sampleArgs();
      data.rows = [
        { a: null, b: null, c: null },
        { a: 'shoes', b: 1588024800000, c: 3 },
      ];
      const hasCompatibleActions = jest.fn().mockResolvedValue(true);
      expect(
        await getColumnsFilterable(data, {
          hasCompatibleActions,
        } as unknown as IInterpreterRenderHandlers)
      ).toEqual([true, true, true]);
      expect(hasCompatibleActions).toHaveBeenCalledTimes(data.columns.length);
      for (const id of data.columns.map((_, i) => i + 1)) {
        expect(hasCompatibleActions).toHaveBeenNthCalledWith(
          id,
          expect.objectContaining({
            name: 'filter',
            data: expect.objectContaining({
              data: [expect.objectContaining({ row: 1 })],
            }),
          })
        );
      }
    });
  });
});
