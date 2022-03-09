/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiDataGridSorting } from '@elastic/eui';
import { Datatable } from 'src/plugins/expressions';

import {
  createGridFilterHandler,
  createGridResizeHandler,
  createGridSortingConfig,
  createGridHideHandler,
  createTransposeColumnFilterHandler,
} from './table_actions';
import { LensMultiTable } from '../../../common';
import { LensGridDirection, ColumnConfig } from '../../../common/expressions';

function getDefaultConfig(): ColumnConfig {
  return {
    columns: [
      { columnId: 'a', type: 'lens_datatable_column' },
      { columnId: 'b', type: 'lens_datatable_column' },
    ],
    sortingColumnId: '',
    sortingDirection: 'none',
  };
}

function createTableRef(
  { withDate }: { withDate: boolean } = { withDate: false }
): React.MutableRefObject<Datatable> {
  return {
    current: {
      type: 'datatable',
      rows: [],
      columns: [
        {
          id: 'a',
          name: 'field',
          meta: { type: withDate ? 'date' : 'number', field: 'a' },
        },
      ],
    },
  };
}

function createUntransposedRef(options?: {
  withDate: boolean;
}): React.MutableRefObject<LensMultiTable> {
  return {
    current: {
      type: 'lens_multitable',
      tables: {
        first: createTableRef(options).current,
      },
    },
  };
}

describe('Table actions', () => {
  const onEditAction = jest.fn();

  describe('Table filtering', () => {
    it('should set a filter on click with the correct configuration', () => {
      const onClickValue = jest.fn();
      const tableRef = createTableRef();
      const filterHandle = createGridFilterHandler(tableRef, onClickValue);

      filterHandle('a', 100, 0, 0);
      expect(onClickValue).toHaveBeenCalledWith({
        data: [
          {
            column: 0,
            row: 0,
            table: tableRef.current,
            value: 100,
          },
        ],
        negate: false,
      });
    });

    it('should set a negate filter on click with the correct confgiuration', () => {
      const onClickValue = jest.fn();
      const tableRef = createTableRef();
      const filterHandle = createGridFilterHandler(tableRef, onClickValue);

      filterHandle('a', 100, 0, 0, true);
      expect(onClickValue).toHaveBeenCalledWith({
        data: [
          {
            column: 0,
            row: 0,
            table: tableRef.current,
            value: 100,
          },
        ],
        negate: true,
      });
    });

    it('should set a time filter on click', () => {
      const onClickValue = jest.fn();
      const tableRef = createTableRef({ withDate: true });
      const filterHandle = createGridFilterHandler(tableRef, onClickValue);

      filterHandle('a', 100, 0, 0);
      expect(onClickValue).toHaveBeenCalledWith({
        data: [
          {
            column: 0,
            row: 0,
            table: tableRef.current,
            value: 100,
          },
        ],
        negate: false,
      });
    });

    it('should set a negative time filter on click', () => {
      const onClickValue = jest.fn();
      const tableRef = createTableRef({ withDate: true });
      const filterHandle = createGridFilterHandler(tableRef, onClickValue);

      filterHandle('a', 100, 0, 0, true);
      expect(onClickValue).toHaveBeenCalledWith({
        data: [
          {
            column: 0,
            row: 0,
            table: tableRef.current,
            value: 100,
          },
        ],
        negate: true,
      });
    });
  });

  describe('Transposed column filtering', () => {
    it('should set a filter on click with the correct configuration', () => {
      const onClickValue = jest.fn();
      const tableRef = createUntransposedRef({ withDate: true });
      tableRef.current.tables.first.rows = [{ a: 123456 }];
      const filterHandle = createTransposeColumnFilterHandler(onClickValue, tableRef);

      filterHandle(
        [
          {
            originalBucketColumn: tableRef.current.tables.first.columns[0],
            value: 123456,
          },
        ],
        false
      );
      expect(onClickValue).toHaveBeenCalledWith({
        data: [
          {
            column: 0,
            row: 0,
            table: tableRef.current.tables.first,
            value: 123456,
          },
        ],
        negate: false,
      });
    });

    it('should set a negate filter on click with the correct configuration', () => {
      const onClickValue = jest.fn();
      const tableRef = createUntransposedRef({ withDate: true });
      tableRef.current.tables.first.rows = [{ a: 123456 }];
      const filterHandle = createTransposeColumnFilterHandler(onClickValue, tableRef);

      filterHandle(
        [
          {
            originalBucketColumn: tableRef.current.tables.first.columns[0],
            value: 123456,
          },
        ],
        true
      );
      expect(onClickValue).toHaveBeenCalledWith({
        data: [
          {
            column: 0,
            row: 0,
            table: tableRef.current.tables.first,
            value: 123456,
          },
        ],
        negate: true,
      });
    });

    it('should set a multi filter and look up positions of the values', () => {
      const onClickValue = jest.fn();
      const tableRef = createUntransposedRef({ withDate: false });
      const filterHandle = createTransposeColumnFilterHandler(onClickValue, tableRef);
      tableRef.current.tables.first.columns = [
        {
          id: 'a',
          name: 'a',
          meta: {
            type: 'string',
          },
        },
        {
          id: 'b',
          name: 'b',
          meta: {
            type: 'string',
          },
        },
      ];
      tableRef.current.tables.first.rows = [
        {
          a: 'a1',
          b: 'b1',
        },
        {
          a: 'a2',
          b: 'b2',
        },
        {
          a: 'a3',
          b: 'b3',
        },
        {
          a: 'a4',
          b: 'b4',
        },
      ];

      filterHandle(
        [
          {
            originalBucketColumn: tableRef.current.tables.first.columns[0],
            value: 'a2',
          },
          {
            originalBucketColumn: tableRef.current.tables.first.columns[1],
            value: 'b3',
          },
        ],
        false
      );
      expect(onClickValue).toHaveBeenCalledWith({
        data: [
          {
            column: 0,
            row: 1,
            table: tableRef.current.tables.first,
            value: 'a2',
          },
          {
            column: 1,
            row: 2,
            table: tableRef.current.tables.first,
            value: 'b3',
          },
        ],
        negate: false,
      });
    });
  });
  describe('Table sorting', () => {
    it('should create the right configuration for all types of sorting', () => {
      const configs: Array<{
        input: { direction: LensGridDirection; sortBy: string };
        output: EuiDataGridSorting['columns'];
      }> = [
        { input: { direction: 'asc', sortBy: 'a' }, output: [{ id: 'a', direction: 'asc' }] },
        { input: { direction: 'none', sortBy: 'a' }, output: [] },
        { input: { direction: 'asc', sortBy: '' }, output: [] },
      ];
      for (const { input, output } of configs) {
        const { sortBy, direction } = input;
        expect(createGridSortingConfig(sortBy, direction, onEditAction)).toMatchObject(
          expect.objectContaining({ columns: output })
        );
      }
    });

    it('should return the correct next configuration value based on the current state', () => {
      const sorter = createGridSortingConfig('a', 'none', onEditAction);
      // Click on the 'a' column
      sorter.onSort([{ id: 'a', direction: 'asc' }]);

      // Click on another column 'b'
      sorter.onSort([
        { id: 'a', direction: 'asc' },
        { id: 'b', direction: 'asc' },
      ]);

      // Change the sorting of 'a'
      sorter.onSort([{ id: 'a', direction: 'desc' }]);

      // Toggle the 'a' current sorting (remove sorting)
      sorter.onSort([]);

      expect(onEditAction.mock.calls).toEqual([
        [
          {
            action: 'sort',
            columnId: 'a',
            direction: 'asc',
          },
        ],
        [
          {
            action: 'sort',
            columnId: 'b',
            direction: 'asc',
          },
        ],
        [
          {
            action: 'sort',
            columnId: 'a',
            direction: 'desc',
          },
        ],
        [
          {
            action: 'sort',
            columnId: undefined,
            direction: 'none',
          },
        ],
      ]);
    });
  });
  describe('Table resize', () => {
    const setColumnConfig = jest.fn();

    it('should resize the table locally and globally with the given size', () => {
      const columnConfig = getDefaultConfig();
      const resizer = createGridResizeHandler(columnConfig, setColumnConfig, onEditAction);
      resizer({ columnId: 'a', width: 100 });

      expect(setColumnConfig).toHaveBeenCalledWith({
        ...columnConfig,
        columns: [
          { columnId: 'a', width: 100, type: 'lens_datatable_column' },
          {
            columnId: 'b',
            type: 'lens_datatable_column',
          },
        ],
      });

      expect(onEditAction).toHaveBeenCalledWith({ action: 'resize', columnId: 'a', width: 100 });
    });

    it('should pull out the table custom width from the local state when passing undefined', () => {
      const columnConfig = getDefaultConfig();
      columnConfig.columns = [{ columnId: 'a', width: 100, type: 'lens_datatable_column' }];

      const resizer = createGridResizeHandler(columnConfig, setColumnConfig, onEditAction);
      resizer({ columnId: 'a', width: undefined });

      expect(setColumnConfig).toHaveBeenCalledWith({
        ...columnConfig,
        columns: [{ columnId: 'a', width: undefined, type: 'lens_datatable_column' }],
      });

      expect(onEditAction).toHaveBeenCalledWith({
        action: 'resize',
        columnId: 'a',
        width: undefined,
      });
    });
  });
  describe('Column hiding', () => {
    const setColumnConfig = jest.fn();

    it('should allow to hide column', () => {
      const columnConfig = getDefaultConfig();
      const hiding = createGridHideHandler(columnConfig, setColumnConfig, onEditAction);
      hiding({ columnId: 'a' });

      expect(setColumnConfig).toHaveBeenCalledWith({
        ...columnConfig,
        columns: [
          { columnId: 'a', hidden: true, type: 'lens_datatable_column' },
          { columnId: 'b', type: 'lens_datatable_column' },
        ],
      });

      expect(onEditAction).toHaveBeenCalledWith({ action: 'toggle', columnId: 'a' });
    });
  });
});
