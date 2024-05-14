/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DataContext } from './table_basic';
import { createGridCell } from './cell_value';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import { Datatable } from '@kbn/expressions-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { DatatableArgs, ColumnConfigArg } from '../../../../common/expressions';
import { DataContextType } from './types';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { render, screen } from '@testing-library/react';

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
  const { theme: setUpMockTheme } = coreMock.createSetup();
  const CellRenderer = createGridCell(
    {
      a: { convert: (x) => `formatted ${x}` } as FieldFormat,
    },
    { columns: [], sortingColumnId: '', sortingDirection: 'none' },
    DataContext,
    setUpMockTheme
  );

  const setCellProps = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  const DataContextProviderWrapper =
    (wrapperProps?: Partial<DataContextType>) =>
    ({ children }: { children: React.ReactNode }) => {
      return (
        <DataContext.Provider
          value={{
            table,
            alignments: {
              a: 'right',
            },
            ...wrapperProps,
          }}
        >
          {children}
        </DataContext.Provider>
      );
    };
  const renderCellRenderer = () => {
    const rtlRender = render(
      <CellRenderer
        rowIndex={0}
        colIndex={0}
        columnId="a"
        setCellProps={setCellProps}
        isExpandable={false}
        isDetails={false}
        isExpanded={false}
      />,
      { wrapper: DataContextProviderWrapper() }
    );
    return { ...rtlRender };
  };

  it('renders formatted value', () => {
    renderCellRenderer();
    expect(screen.getByText('formatted 123')).toHaveTextContent('formatted 123');
  });

  it('set class with text alignment', () => {
    renderCellRenderer();
    expect(screen.getByText('formatted 123')).toHaveClass('lnsTableCell--right');
  });

  it('does not set multiline class for regular height tables', () => {
    renderCellRenderer();
    expect(screen.getByText('formatted 123')).not.toHaveClass('lnsTableCell--multiline');
  });

  it('set multiline class for auto height tables', () => {
    const MultiLineCellRenderer = createGridCell(
      {
        a: { convert: (x) => `formatted ${x}` } as FieldFormat,
      },
      { columns: [], sortingColumnId: '', sortingDirection: 'none' },
      DataContext,
      setUpMockTheme,
      true
    );
    render(
      <MultiLineCellRenderer
        rowIndex={0}
        colIndex={0}
        columnId="a"
        setCellProps={setCellProps}
        isExpandable={false}
        isDetails={false}
        isExpanded={false}
      />,
      { wrapper: DataContextProviderWrapper() }
    );

    expect(screen.getByText('formatted 123')).toHaveClass('lnsTableCell--multiline');
  });

  it('renders as button if oneClickFilter is set', () => {
    const MultiLineCellRenderer = createGridCell(
      {
        a: { convert: (x) => `formatted ${x}` } as FieldFormat,
      },
      {
        columns: [
          {
            columnId: 'a',
            type: 'lens_datatable_column',
            oneClickFilter: true,
          },
        ],
        sortingColumnId: '',
        sortingDirection: 'none',
      },
      DataContext,
      setUpMockTheme,
      true
    );
    render(
      <MultiLineCellRenderer
        rowIndex={0}
        colIndex={0}
        columnId="a"
        setCellProps={setCellProps}
        isExpandable={false}
        isDetails={false}
        isExpanded={false}
      />,
      { wrapper: DataContextProviderWrapper({ handleFilterClick: () => {} }) }
    );
    expect(screen.getByRole('button')).toHaveTextContent('formatted 123');
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
        setUpMockTheme
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

    function renderCellComponent(
      columnConfig = getColumnConfiguration(),
      context: Partial<DataContextType> = {}
    ) {
      const CellRendererWithPalette = getCellRenderer(columnConfig);

      const rtlRender = render(
        <CellRendererWithPalette
          rowIndex={0}
          colIndex={0}
          columnId="a"
          setCellProps={setCellProps}
          isExpandable={false}
          isDetails={false}
          isExpanded={false}
        />,
        {
          wrapper: DataContextProviderWrapper({
            table,
            minMaxByColumnId: { a: { min: 12, max: 155 /* > 123 */ } },
            getColorForValue: customPalette.getColorForValue,
            ...context,
          }),
        }
      );
      return { ...rtlRender };
    }

    it('ignores coloring when colorMode is set to "none"', () => {
      renderCellComponent();
      expect(setCellProps).not.toHaveBeenCalled();
    });

    it('should set the coloring of the cell when enabled', () => {
      const columnConfig = getColumnConfiguration();
      columnConfig.columns[0].colorMode = 'cell';

      renderCellComponent(columnConfig, {});

      expect(setCellProps).toHaveBeenCalledWith({
        style: expect.objectContaining({ backgroundColor: 'blue' }),
      });
    });

    it('should set the coloring of the text when enabled', () => {
      const columnConfig = getColumnConfiguration();
      columnConfig.columns[0].colorMode = 'text';

      renderCellComponent(columnConfig, {});

      expect(setCellProps).toHaveBeenCalledWith({
        style: expect.objectContaining({ color: 'blue' }),
      });
    });

    it('should not color the cell when the value is an array', () => {
      setCellProps.mockClear();
      const columnConfig = getColumnConfiguration();
      columnConfig.columns[0].colorMode = 'cell';

      renderCellComponent(columnConfig, {
        table: { ...table, rows: [{ a: [10, 123] }] },
      });

      expect(setCellProps).not.toHaveBeenCalled();
    });
  });
});
