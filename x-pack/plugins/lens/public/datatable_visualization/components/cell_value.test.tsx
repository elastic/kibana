/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl } from '@kbn/test/jest';
import React from 'react';
import { DataContext } from './table_basic';
import { createGridCell } from './cell_value';
import { FieldFormat } from 'src/plugins/data/public';
import { Datatable } from 'src/plugins/expressions/public';
import { IUiSettingsClient } from 'kibana/public';
import { act } from 'react-dom/test-utils';
import { ReactWrapper } from 'enzyme';
import { Args, ColumnConfigArg } from '../expression';
import { CustomPaletteState } from 'src/plugins/charts/public';
import { DataContextType } from './types';

describe('datatable cell renderer', () => {
  const table: Datatable = {
    type: 'datatable',
    columns: [
      {
        id: 'a',
        name: 'a',
        meta: {
          type: 'number',
        },
      },
    ],
    rows: [{ a: 123 }],
  };
  const CellRenderer = createGridCell(
    {
      a: { convert: (x) => `formatted ${x}` } as FieldFormat,
    },
    { columns: [], sortingColumnId: '', sortingDirection: 'none' },
    DataContext,
    ({ get: jest.fn() } as unknown) as IUiSettingsClient
  );

  it('renders formatted value', () => {
    const instance = mountWithIntl(
      <DataContext.Provider
        value={{
          table,
          alignments: {
            a: 'right',
          },
        }}
      >
        <CellRenderer
          rowIndex={0}
          columnId="a"
          setCellProps={() => {}}
          isExpandable={false}
          isDetails={false}
          isExpanded={false}
        />
      </DataContext.Provider>
    );
    expect(instance.text()).toEqual('formatted 123');
  });

  it('set class with text alignment', () => {
    const cell = mountWithIntl(
      <DataContext.Provider
        value={{
          table,
          alignments: {
            a: 'right',
          },
        }}
      >
        <CellRenderer
          rowIndex={0}
          columnId="a"
          setCellProps={() => {}}
          isExpandable={false}
          isDetails={false}
          isExpanded={false}
        />
      </DataContext.Provider>
    );
    expect(cell.find('.lnsTableCell').prop('className')).toContain('--right');
  });

  describe('dynamic coloring', () => {
    function getCellRenderer(columnConfig: Args) {
      return createGridCell(
        {
          a: { convert: (x) => `formatted ${x}` } as FieldFormat,
        },
        columnConfig,
        DataContext,
        ({ get: jest.fn() } as unknown) as IUiSettingsClient
      );
    }
    function getColumnConfiguration(): Args {
      return {
        title: 'myData',
        columns: [
          {
            columnId: 'a',
            colorMode: 'none',
            palette: {
              type: 'palette',
              name: 'custom',
              params: {
                colors: ['#aaa', '#bbb', '#ccc', '#ddd', '#eee'],
                gradient: false,
                stops: [20, 40, 60, 80, 100],
                range: 'percent',
                rangeMin: 0,
                rangeMax: 100,
              },
            },
            type: 'lens_datatable_column',
          } as ColumnConfigArg,
        ],
        sortingColumnId: '',
        sortingDirection: 'none',
      };
    }

    function flushEffect(component: ReactWrapper) {
      return act(async () => {
        await component;
        await new Promise((r) => setImmediate(r));
        component.update();
      });
    }

    async function renderCellComponent(columnConfig: Args, context: Partial<DataContextType> = {}) {
      const CellRendererWithPalette = getCellRenderer(columnConfig);
      const setCellProps = jest.fn();

      const cell = mountWithIntl(
        <DataContext.Provider
          value={{
            table,
            minMaxByColumnId: { a: { min: 12, max: 155 /* > 123 */ } },
            ...context,
          }}
        >
          <CellRendererWithPalette
            rowIndex={0}
            columnId="a"
            setCellProps={setCellProps}
            isExpandable={false}
            isDetails={false}
            isExpanded={false}
          />
        </DataContext.Provider>
      );

      await flushEffect(cell);

      return { setCellProps, cell };
    }

    it('ignores coloring when colorMode is set to "none"', async () => {
      const { setCellProps } = await renderCellComponent(getColumnConfiguration());

      expect(setCellProps).not.toHaveBeenCalled();
    });

    describe('progression: "fixed"', () => {
      // last value inclusiveness is something to be tested on the configuration side:
      // stops are generated in a way to handle also the inclusiveness when last stop value === rangeMax

      it('should set the coloring of the cell when enabled - within numeric range', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'cell';
        columnConfig.columns[0].palette!.params!.range = 'number';
        columnConfig.columns[0].palette!.params!.rangeMin = 12;
        columnConfig.columns[0].palette!.params!.rangeMax = 140;
        columnConfig.columns[0].palette!.params!.continuity = 'above';

        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 12, max: 155 /* > 123 */ } },
        });

        expect(setCellProps).toHaveBeenCalledWith({
          style: expect.objectContaining({ backgroundColor: '#aaa' }),
        });
      });

      it('should set the coloring of the text when enabled - within numeric range', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'text';
        columnConfig.columns[0].palette!.params!.range = 'number';
        columnConfig.columns[0].palette!.params!.rangeMin = 12;
        columnConfig.columns[0].palette!.params!.rangeMax = 140;
        columnConfig.columns[0].palette!.params!.continuity = 'above';

        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 12, max: 155 /* > 123 */ } },
        });

        expect(setCellProps).toHaveBeenCalledWith({
          style: expect.objectContaining({ color: '#aaa' }),
        });
      });

      it('should set the coloring of the cell when enabled - use custom stops', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'cell';
        (columnConfig.columns[0].palette!.params! as CustomPaletteState).stops = [0, 99, 100];
        columnConfig.columns[0].palette!.params!.continuity = 'above';

        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 12, max: 155 /* > 123 */ } },
        });

        expect(setCellProps).toHaveBeenCalledWith({
          style: expect.objectContaining({ backgroundColor: '#bbb' }),
        });
      });

      it('should set the coloring of the cell when enabled - use custom stops percent', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'cell';
        (columnConfig.columns[0].palette!.params! as CustomPaletteState).stops = [20, 60, 100];
        columnConfig.columns[0].palette!.params!.continuity = 'above';
        columnConfig.columns[0].palette!.params!.range = 'percent';
        columnConfig.columns[0].palette!.params!.rangeMin = 0;
        columnConfig.columns[0].palette!.params!.rangeMax = 100;

        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 123, max: 500 } },
        });

        expect(setCellProps).toHaveBeenCalledWith({
          style: expect.objectContaining({ backgroundColor: '#aaa' }),
        });
      });

      it('should adjust the text coloring based on contrast on cell coloring', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'cell';
        columnConfig.columns[0].palette!.params!.colors = ['#aaa', '#bbb', '#000']; // black for higher contrast
        columnConfig.columns[0].palette!.params!.continuity = 'above';
        columnConfig.columns[0].palette!.params!.range = 'number';

        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 0, max: 100 /* < 123 */ } },
        });

        expect(setCellProps).toHaveBeenCalledWith({
          // white text on black cell
          style: {
            backgroundColor: '#000',
            color: '#ffffff', // the light color is picked from the specific theme detected
          },
        });
      });

      it('should apply the palette stops only to the passed range, not extending extremities colors for outbound values - numeric range', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'cell';
        (columnConfig.columns[0].palette!.params! as CustomPaletteState).stops = [0, 5, 100];
        columnConfig.columns[0].palette!.params!.range = 'number';
        columnConfig.columns[0].palette!.params!.rangeMin = 10;
        columnConfig.columns[0].palette!.params!.rangeMax = 50;

        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 0, max: 150 } },
        });

        expect(setCellProps).not.toHaveBeenCalled();
      });

      it('should apply the palette stops only to the passed range, not extending extremities colors for outbound values - percent range', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'cell';
        (columnConfig.columns[0].palette!.params! as CustomPaletteState).stops = [0, 5, 100];
        columnConfig.columns[0].palette!.params!.range = 'percent';
        columnConfig.columns[0].palette!.params!.rangeMin = 10;
        columnConfig.columns[0].palette!.params!.rangeMax = 50;

        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 0, max: 150 } },
        });

        expect(setCellProps).not.toHaveBeenCalled();
      });
    });
  });
});
