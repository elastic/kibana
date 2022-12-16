/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiDataGridColumnCellAction, EuiDataGridColumnCellActionProps } from '@elastic/eui';
import type { Datatable } from '@kbn/expressions-plugin/public';
import { shallow } from 'enzyme';
import { ReactNode } from 'react';
import { FormatFactory } from '../../../../common/types';
import type { LensCellValueAction } from '../../../types';
import { createGridColumns } from './columns';

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
const visibleColumns = ['a'];
const cellValueAction: LensCellValueAction = {
  displayName: 'Test',
  id: 'test',
  iconType: 'test-icon',
  execute: () => {},
};

type CreateGridColumnsParams = Parameters<typeof createGridColumns>;
const callCreateGridColumns = (
  params: Partial<{
    bucketColumns: CreateGridColumnsParams[0];
    table: CreateGridColumnsParams[1];
    handleFilterClick: CreateGridColumnsParams[2];
    handleTransposedColumnClick: CreateGridColumnsParams[3];
    isReadOnly: CreateGridColumnsParams[4];
    columnConfig: CreateGridColumnsParams[5];
    visibleColumns: CreateGridColumnsParams[6];
    formatFactory: CreateGridColumnsParams[7];
    onColumnResize: CreateGridColumnsParams[8];
    onColumnHide: CreateGridColumnsParams[9];
    alignments: CreateGridColumnsParams[10];
    headerRowHeight: CreateGridColumnsParams[11];
    headerRowLines: CreateGridColumnsParams[12];
    columnCellValueActions: CreateGridColumnsParams[13];
    closeCellPopover: CreateGridColumnsParams[14];
    columnFilterable: CreateGridColumnsParams[15];
  }> = {}
) =>
  createGridColumns(
    params.bucketColumns ?? [],
    params.table ?? table,
    params.handleFilterClick,
    params.handleTransposedColumnClick,
    params.isReadOnly ?? false,
    params.columnConfig ?? { columns: [], sortingColumnId: undefined, sortingDirection: 'none' },
    params.visibleColumns ?? visibleColumns,
    params.formatFactory ?? (((x: unknown) => ({ convert: () => x })) as unknown as FormatFactory),
    params.onColumnResize ?? jest.fn(),
    params.onColumnHide ?? jest.fn(),
    params.alignments ?? {},
    params.headerRowHeight ?? 'auto',
    params.headerRowLines ?? 1,
    params.columnCellValueActions ?? [],
    params.closeCellPopover ?? jest.fn(),
    params.columnFilterable ?? []
  );

const renderCellAction = (
  cellActions: EuiDataGridColumnCellAction[] | undefined,
  index: number
) => {
  if (!cellActions?.[index]) {
    return null;
  }
  const cellAction = (cellActions[index] as (props: EuiDataGridColumnCellActionProps) => ReactNode)(
    {
      rowIndex: 0,
      columnId: 'a',
      Component: () => <></>,
    } as unknown as EuiDataGridColumnCellActionProps
  );
  return shallow(<div>{cellAction}</div>);
};

describe('getContentData', () => {
  describe('cellActions', () => {
    it('should include filter actions', () => {
      const [{ cellActions }] = callCreateGridColumns({
        handleFilterClick: () => {},
        columnFilterable: [true],
      });
      expect(cellActions).toHaveLength(2);
    });

    it('should not include filter actions if column not filterable', () => {
      const [{ cellActions }] = callCreateGridColumns({
        handleFilterClick: () => {},
        columnFilterable: [false],
      });
      expect(cellActions).toHaveLength(0);
    });

    it('should not include filter actions if no filter handler defined', () => {
      const [{ cellActions }] = callCreateGridColumns({
        columnFilterable: [true],
      });
      expect(cellActions).toHaveLength(0);
    });

    it('should include cell value actions', () => {
      const [{ cellActions }] = callCreateGridColumns({
        columnCellValueActions: [[cellValueAction]],
      });
      expect(cellActions).toHaveLength(1);
    });

    it('should include all actions', () => {
      const [{ cellActions }] = callCreateGridColumns({
        handleFilterClick: () => {},
        columnFilterable: [true],
        columnCellValueActions: [[cellValueAction]],
      });
      expect(cellActions).toHaveLength(3);
    });

    it('should render filterFor as first action', () => {
      const [{ cellActions }] = callCreateGridColumns({
        handleFilterClick: () => {},
        columnFilterable: [true],
        columnCellValueActions: [[cellValueAction]],
      });
      const wrapper = renderCellAction(cellActions, 0);
      expect(wrapper?.find('Component').prop('data-test-subj')).toEqual('lensDatatableFilterFor');
    });

    it('should render filterOut as second action', () => {
      const [{ cellActions }] = callCreateGridColumns({
        handleFilterClick: () => {},
        columnFilterable: [true],
        columnCellValueActions: [[cellValueAction]],
      });
      const wrapper = renderCellAction(cellActions, 1);
      expect(wrapper?.find('Component').prop('data-test-subj')).toEqual('lensDatatableFilterOut');
    });

    it('should render cellValue actions at the end', () => {
      const [{ cellActions }] = callCreateGridColumns({
        handleFilterClick: () => {},
        columnFilterable: [true],
        columnCellValueActions: [[cellValueAction]],
      });
      const wrapper = renderCellAction(cellActions, 2);
      expect(wrapper?.find('Component').prop('data-test-subj')).toEqual(
        'lensDatatableCellAction-test'
      );
    });
  });
});
