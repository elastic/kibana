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
import { Args } from '../expression';
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
                colors: ['#aaa', '#bbb', '#ccc'],
                gradient: false,
                stops: [],
                range: 'percent',
                rangeMin: 0,
                rangeMax: 100,
              },
            },
            type: 'lens_datatable_column',
          },
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
      it('should set the coloring of the cell when enabled', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'cell';

        const gradientHelper = jest.fn(() => '#000');
        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 0, max: 123 } },
        });

        // 123 is exactly the max range of 123 set, so it picks the last color
        expect(setCellProps).toHaveBeenCalledWith({
          style: expect.objectContaining({ backgroundColor: '#ccc' }),
        });
        expect(gradientHelper).not.toHaveBeenCalled();
      });

      it('should not set the color of the cell if vaue is out of range', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'cell';

        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 0, max: 0 } },
        });

        // 123 is above the max range of 100 set
        expect(setCellProps).not.toHaveBeenCalled();
      });

      it('should set the coloring of the text when enabled', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'text';

        const gradientHelper = jest.fn(() => '#000');
        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 0, max: 123 } },
        });
        // 123 is exactly the max range of 123 set, so it picks the last color
        expect(setCellProps).toHaveBeenCalledWith({
          style: expect.objectContaining({ color: '#ccc' }),
        });
        expect(gradientHelper).not.toHaveBeenCalled();
      });

      it('should set the coloring of the cell when enabled - within numeric rangeMax', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'cell';
        columnConfig.columns[0].palette!.params!.range = 'number';
        columnConfig.columns[0].palette!.params!.rangeMax = 123;

        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 12, max: 155 /* > 123 */ } },
        });

        expect(setCellProps).toHaveBeenCalledWith({
          style: expect.objectContaining({ backgroundColor: '#ccc' }),
        });
      });

      it('should not set the coloring of the cell when enabled - over numeric rangeMax', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'cell';
        columnConfig.columns[0].palette!.params!.range = 'number';
        columnConfig.columns[0].palette!.params!.rangeMax = 100;

        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 12, max: 155 /* > 123 */ } },
        });

        expect(setCellProps).not.toHaveBeenCalled();
      });

      it('should set the coloring of the cell when enabled - over numeric rangeMin', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'cell';
        columnConfig.columns[0].palette!.params!.range = 'number';
        columnConfig.columns[0].palette!.params!.rangeMin = 75;

        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 12, max: 155 /* > 123 */ } },
        });

        expect(setCellProps).toHaveBeenCalledWith({
          style: expect.objectContaining({ backgroundColor: '#bbb' }),
        });
      });

      it('should not set the coloring of the cell when enabled - below numeric rangeMin', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'cell';
        columnConfig.columns[0].palette!.params!.range = 'number';
        columnConfig.columns[0].palette!.params!.rangeMin = 150;

        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 12, max: 155 /* > 123 */ } },
        });

        expect(setCellProps).not.toHaveBeenCalled();
      });

      it('should set the coloring of the cell when enabled - over percent rangeMin', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'cell';
        columnConfig.columns[0].palette!.params!.range = 'percent';
        columnConfig.columns[0].palette!.params!.rangeMin = 10;

        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 12, max: 155 /* > 123 */ } },
        });

        expect(setCellProps).toHaveBeenCalledWith({
          style: expect.objectContaining({ backgroundColor: '#bbb' }),
        });
      });

      it('should not set the coloring of the cell when enabled - below percent rangeMin', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'cell';
        columnConfig.columns[0].palette!.params!.range = 'percent';
        columnConfig.columns[0].palette!.params!.rangeMin = 90; // > 123 / (155 - 12) = 86%

        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 12, max: 155 /* > 123 */ } },
        });

        expect(setCellProps).not.toHaveBeenCalled();
      });

      it('should set the coloring of the cell when enabled - below percent rangeMax', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'cell';
        columnConfig.columns[0].palette!.params!.range = 'percent';
        columnConfig.columns[0].palette!.params!.rangeMax = 95;

        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 12, max: 155 /* > 123 */ } },
        });

        expect(setCellProps).toHaveBeenCalledWith({
          style: expect.objectContaining({ backgroundColor: '#ccc' }),
        });
      });

      it('should not set the coloring of the cell when enabled - over percent rangeMax', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'cell';
        columnConfig.columns[0].palette!.params!.range = 'percent';
        columnConfig.columns[0].palette!.params!.rangeMax = 50;

        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 12, max: 155 /* > 123 */ } },
        });

        expect(setCellProps).not.toHaveBeenCalled();
      });

      it('should set the coloring of the cell when enabled - use custom stops', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'cell';
        (columnConfig.columns[0].palette!.params! as CustomPaletteState).stops = [0, 99, 100];

        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 12, max: 155 /* > 123 */ } },
        });

        expect(setCellProps).toHaveBeenCalledWith({
          style: expect.objectContaining({ backgroundColor: '#bbb' }),
        });
      });

      it('should adjust the text coloring based on contrast on cell coloring', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'cell';
        columnConfig.columns[0].palette!.params!.colors = ['#aaa', '#bbb', '#000']; // black for higher contrast

        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 0, max: 123 } },
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

    describe('progression: "gradient"', () => {
      it('should set the coloring of the cell when enabled', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'cell';
        columnConfig.columns[0].palette!.params!.gradient = true;

        const gradientHelper = jest.fn(() => '#000');
        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 12, max: 250 /* > 123 */ } },
        });

        expect(gradientHelper).toHaveBeenCalledWith(123);
        expect(setCellProps).toHaveBeenCalledWith({
          // 123 is the middle of the range
          style: expect.objectContaining({
            backgroundColor: '#000',
          }),
        });
      });

      it('should set the coloring of the text when enabled', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'text';
        columnConfig.columns[0].palette!.params!.gradient = true;

        const gradientHelper = jest.fn(() => '#000');
        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 12, max: 250 /* > 123 */ } },
        });

        expect(gradientHelper).toHaveBeenCalledWith(123);
        expect(setCellProps).toHaveBeenCalledWith({
          style: {
            color: '#000',
          },
        });
      });

      it('should set the coloring of the cell when enabled - use custom stops', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'cell';
        columnConfig.columns[0].palette!.params!.gradient = true;
        (columnConfig.columns[0].palette!.params! as CustomPaletteState).stops = [0, 99, 100];

        const gradientHelper = jest.fn(() => '#000');
        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 12, max: 155 /* > 123 */ } },
        });

        expect(gradientHelper).toHaveBeenCalledWith((100 * (123 - 12)) / (155 - 12));
        expect(setCellProps).toHaveBeenCalledWith({
          style: expect.objectContaining({ backgroundColor: '#000' }),
        });
      });

      it('should not use use the gradient if the helper is not passed - working as fixed', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'cell';
        columnConfig.columns[0].palette!.params!.gradient = true;

        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 12, max: 250 /* > 123 */ } },
        });

        expect(setCellProps).toHaveBeenCalledWith({
          // 123 is the middle of the range
          style: expect.objectContaining({
            backgroundColor: '#bbb',
          }),
        });
      });

      it('should apply the palette stops only to the passed range - numeric range', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'cell';
        columnConfig.columns[0].palette!.params!.gradient = true;
        (columnConfig.columns[0].palette!.params! as CustomPaletteState).stops = [0, 5, 123];
        columnConfig.columns[0].palette!.params!.range = 'number';
        columnConfig.columns[0].palette!.params!.rangeMin = 10;
        columnConfig.columns[0].palette!.params!.rangeMax = 123;

        const gradientHelper = jest.fn(() => '#000');
        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 0, max: 123 } },
        });

        expect(setCellProps).toHaveBeenCalledWith({
          style: expect.objectContaining({ backgroundColor: '#000' }),
        });
        expect(gradientHelper).toHaveBeenCalled();
      });

      it('should apply the palette stops only to the passed range, not extending extremities colors for outbound values - numeric range', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'cell';
        columnConfig.columns[0].palette!.params!.gradient = true;
        (columnConfig.columns[0].palette!.params! as CustomPaletteState).stops = [0, 5, 150];
        columnConfig.columns[0].palette!.params!.range = 'number';
        columnConfig.columns[0].palette!.params!.rangeMin = 10;
        columnConfig.columns[0].palette!.params!.rangeMax = 100;

        const gradientHelper = jest.fn(() => '#000');
        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 0, max: 150 } },
        });

        expect(setCellProps).not.toHaveBeenCalled();
        expect(gradientHelper).not.toHaveBeenCalled();
      });

      it('should apply the palette stops only to the passed range - percent range', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'cell';
        columnConfig.columns[0].palette!.params!.gradient = true;
        (columnConfig.columns[0].palette!.params! as CustomPaletteState).stops = [0, 5, 100];
        columnConfig.columns[0].palette!.params!.range = 'percent';
        columnConfig.columns[0].palette!.params!.rangeMin = 10;
        columnConfig.columns[0].palette!.params!.rangeMax = 100;

        const gradientHelper = jest.fn(() => '#000');
        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 0, max: 123 } },
        });

        expect(setCellProps).toHaveBeenCalledWith({
          style: expect.objectContaining({ backgroundColor: '#000' }),
        });
        expect(gradientHelper).toHaveBeenCalled();
      });

      it('should apply the palette stops only to the passed range, not extending color for outbound - percent range', async () => {
        const columnConfig = getColumnConfiguration();
        columnConfig.columns[0].colorMode = 'cell';
        columnConfig.columns[0].palette!.params!.gradient = true;
        (columnConfig.columns[0].palette!.params! as CustomPaletteState).stops = [0, 5, 100];
        columnConfig.columns[0].palette!.params!.range = 'percent';
        columnConfig.columns[0].palette!.params!.rangeMin = 10;
        columnConfig.columns[0].palette!.params!.rangeMax = 50;

        const gradientHelper = jest.fn(() => '#000');
        const { setCellProps } = await renderCellComponent(columnConfig, {
          minMaxByColumnId: { a: { min: 0, max: 123 } },
        });

        expect(setCellProps).not.toHaveBeenCalled();
        expect(gradientHelper).not.toHaveBeenCalled();
      });
    });
  });
});
