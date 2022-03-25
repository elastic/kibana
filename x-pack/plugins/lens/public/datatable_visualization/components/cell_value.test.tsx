/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { DataContext } from './table_basic';
import { createGridCell } from './cell_value';
import type { FieldFormat } from 'src/plugins/field_formats/common';
import { Datatable } from 'src/plugins/expressions/public';
import { IUiSettingsClient } from 'kibana/public';
import { act } from 'react-dom/test-utils';
import { ReactWrapper } from 'enzyme';
import { DatatableArgs, ColumnConfigArg } from '../../../common/expressions';
import { DataContextType } from './types';
import { chartPluginMock } from 'src/plugins/charts/public/mocks';

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
    { get: jest.fn() } as unknown as IUiSettingsClient
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
          colIndex={0}
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
          colIndex={0}
          columnId="a"
          setCellProps={() => {}}
          isExpandable={false}
          isDetails={false}
          isExpanded={false}
        />
      </DataContext.Provider>
    );
    expect(cell.find('.lnsTableCell--right').exists()).toBeTruthy();
  });

  describe('dynamic coloring', () => {
    const paletteRegistry = chartPluginMock.createPaletteRegistry();
    const customPalette = paletteRegistry.get('custom');

    function getCellRenderer(columnConfig: DatatableArgs) {
      return createGridCell(
        {
          a: { convert: (x) => `formatted ${x}` } as FieldFormat,
        },
        columnConfig,
        DataContext,
        { get: jest.fn() } as unknown as IUiSettingsClient
      );
    }
    function getColumnConfiguration(): DatatableArgs {
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
        rowHeightLines: 1,
      };
    }

    function flushEffect(component: ReactWrapper) {
      return act(async () => {
        await component;
        await new Promise((r) => setImmediate(r));
        component.update();
      });
    }

    async function renderCellComponent(
      columnConfig: DatatableArgs,
      context: Partial<DataContextType> = {}
    ) {
      const CellRendererWithPalette = getCellRenderer(columnConfig);
      const setCellProps = jest.fn();

      const cell = mountWithIntl(
        <DataContext.Provider
          value={{
            table,
            minMaxByColumnId: { a: { min: 12, max: 155 /* > 123 */ } },
            getColorForValue: customPalette.getColorForValue,
            ...context,
          }}
        >
          <CellRendererWithPalette
            rowIndex={0}
            colIndex={0}
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

    it('should set the coloring of the cell when enabled', async () => {
      const columnConfig = getColumnConfiguration();
      columnConfig.columns[0].colorMode = 'cell';

      const { setCellProps } = await renderCellComponent(columnConfig, {});

      expect(setCellProps).toHaveBeenCalledWith({
        style: expect.objectContaining({ backgroundColor: 'blue' }),
      });
    });

    it('should set the coloring of the text when enabled', async () => {
      const columnConfig = getColumnConfiguration();
      columnConfig.columns[0].colorMode = 'text';

      const { setCellProps } = await renderCellComponent(columnConfig, {});

      expect(setCellProps).toHaveBeenCalledWith({
        style: expect.objectContaining({ color: 'blue' }),
      });
    });

    it('should not color the cell when the value is an array', async () => {
      const columnConfig = getColumnConfiguration();
      columnConfig.columns[0].colorMode = 'cell';

      const { setCellProps } = await renderCellComponent(columnConfig, {
        table: { ...table, rows: [{ a: [10, 123] }] },
      });

      expect(setCellProps).not.toHaveBeenCalled();
    });
  });
});
