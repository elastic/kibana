/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from 'src/plugins/expressions/public';
import type { PaletteDefinition, PaletteOutput } from 'src/plugins/charts/public';

import {
  getSliceValue,
  getFilterContext,
  byDataColorPaletteMap,
  extractUniqTermsMap,
  checkTableForContainsSmallValues,
  shouldShowValuesInLegend,
} from './render_helpers';
import { chartPluginMock } from '../../../../../src/plugins/charts/public/mocks';
import type { PieLayerState } from '../../common/expressions';

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
      ).toEqual(0);
    });

    it('returns 0 when metric value is 0', () => {
      expect(
        getSliceValue(
          { a: 'Cat', b: 'Home', c: 0 },
          {
            id: 'c',
            name: 'C',
            meta: { type: 'number' },
          }
        )
      ).toEqual(0);
    });

    it('returns 0 when metric value is infinite', () => {
      expect(
        getSliceValue(
          { a: 'Cat', b: 'Home', c: Number.POSITIVE_INFINITY },
          {
            id: 'c',
            name: 'C',
            meta: { type: 'number' },
          }
        )
      ).toEqual(0);
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
          [
            {
              groupByRollup: 'Test',
              value: 100,
              depth: 1,
              path: [],
              sortIndex: 1,
              smAccessorValue: '',
            },
          ],
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
          [
            {
              groupByRollup: 'Test',
              value: 100,
              depth: 1,
              path: [],
              sortIndex: 1,
              smAccessorValue: '',
            },
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
            {
              groupByRollup: 'Test',
              value: 100,
              depth: 1,
              path: [],
              sortIndex: 1,
              smAccessorValue: '',
            },
            {
              groupByRollup: 'Two',
              value: 5,
              depth: 1,
              path: [],
              sortIndex: 1,
              smAccessorValue: '',
            },
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

  describe('#extractUniqTermsMap', () => {
    it('should extract map', () => {
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
      expect(extractUniqTermsMap(table, 'a')).toMatchInlineSnapshot(`
        Object {
          "Foo": 2,
          "Hi": 0,
          "Test": 1,
        }
      `);
      expect(extractUniqTermsMap(table, 'b')).toMatchInlineSnapshot(`
        Object {
          "Three": 1,
          "Two": 0,
        }
      `);
    });
  });

  describe('#byDataColorPaletteMap', () => {
    let datatable: Datatable;
    let paletteDefinition: PaletteDefinition;
    let palette: PaletteOutput;
    const columnId = 'foo';

    beforeEach(() => {
      datatable = {
        rows: [
          {
            [columnId]: '1',
          },
          {
            [columnId]: '2',
          },
        ],
      } as unknown as Datatable;
      paletteDefinition = chartPluginMock.createPaletteRegistry().get('default');
      palette = { type: 'palette' } as PaletteOutput;
    });

    it('should create byDataColorPaletteMap', () => {
      expect(byDataColorPaletteMap(datatable, columnId, paletteDefinition, palette))
        .toMatchInlineSnapshot(`
        Object {
          "getColor": [Function],
        }
      `);
    });

    it('should get color', () => {
      const colorPaletteMap = byDataColorPaletteMap(
        datatable,
        columnId,
        paletteDefinition,
        palette
      );

      expect(colorPaletteMap.getColor('1')).toBe('black');
    });

    it('should return undefined in case if values not in datatable', () => {
      const colorPaletteMap = byDataColorPaletteMap(
        datatable,
        columnId,
        paletteDefinition,
        palette
      );

      expect(colorPaletteMap.getColor('wrong')).toBeUndefined();
    });

    it('should increase rankAtDepth for each new value', () => {
      const colorPaletteMap = byDataColorPaletteMap(
        datatable,
        columnId,
        paletteDefinition,
        palette
      );
      colorPaletteMap.getColor('1');
      colorPaletteMap.getColor('2');

      expect(paletteDefinition.getCategoricalColor).toHaveBeenNthCalledWith(
        1,
        [{ name: '1', rankAtDepth: 0, totalSeriesAtDepth: 2 }],
        { behindText: false },
        undefined
      );

      expect(paletteDefinition.getCategoricalColor).toHaveBeenNthCalledWith(
        2,
        [{ name: '2', rankAtDepth: 1, totalSeriesAtDepth: 2 }],
        { behindText: false },
        undefined
      );
    });
  });

  describe('#checkTableForContainsSmallValues', () => {
    let datatable: Datatable;
    const columnId = 'foo';

    beforeEach(() => {
      datatable = {
        rows: [],
      } as unknown as Datatable;
    });

    it('should return true if the data contains values less than the target percentage (1)', () => {
      datatable.rows = [
        {
          [columnId]: 80,
        },
        {
          [columnId]: 20,
        },
        {
          [columnId]: 1,
        },
      ];
      expect(checkTableForContainsSmallValues(datatable, columnId, 1)).toBeTruthy();
    });

    it('should return true if the data contains values less than the target percentage (42)', () => {
      datatable.rows = [
        {
          [columnId]: 58,
        },
        {
          [columnId]: 42,
        },
        {
          [columnId]: 1,
        },
      ];
      expect(checkTableForContainsSmallValues(datatable, columnId, 42)).toBeTruthy();
    });

    it('should return false if the data contains values greater than the target percentage', () => {
      datatable.rows = [
        {
          [columnId]: 22,
        },
        {
          [columnId]: 56,
        },
        {
          [columnId]: 12,
        },
      ];
      expect(checkTableForContainsSmallValues(datatable, columnId, 1)).toBeFalsy();
    });
  });

  describe('#shouldShowValuesInLegend', () => {
    it('should firstly read the state value', () => {
      expect(
        shouldShowValuesInLegend({ showValuesInLegend: true } as PieLayerState, 'waffle')
      ).toBeTruthy();

      expect(
        shouldShowValuesInLegend({ showValuesInLegend: false } as PieLayerState, 'waffle')
      ).toBeFalsy();
    });

    it('should read value from meta in case of value in state is undefined', () => {
      expect(
        shouldShowValuesInLegend({ showValuesInLegend: undefined } as PieLayerState, 'waffle')
      ).toBeTruthy();

      expect(shouldShowValuesInLegend({} as PieLayerState, 'waffle')).toBeTruthy();

      expect(
        shouldShowValuesInLegend({ showValuesInLegend: undefined } as PieLayerState, 'pie')
      ).toBeFalsy();
    });
  });
});
