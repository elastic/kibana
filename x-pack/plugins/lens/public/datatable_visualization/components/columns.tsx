/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiDataGridColumn,
  EuiDataGridColumnCellActionProps,
  EuiListGroupItemProps,
} from '@elastic/eui';
import type { Datatable, DatatableColumn, DatatableColumnMeta } from 'src/plugins/expressions';
import type { FormatFactory } from '../../types';
import { ColumnConfig } from './table_basic';

export const createGridColumns = (
  bucketColumns: string[],
  table: Datatable,
  handleFilterClick: (
    field: string,
    value: unknown,
    colIndex: number,
    rowIndex: number,
    negate?: boolean
  ) => void,
  handleTransposedColumnClick: (
    bucketValues: Array<{ originalBucketColumn: DatatableColumn; value: unknown }>,
    negate?: boolean
  ) => void,
  isReadOnly: boolean,
  columnConfig: ColumnConfig,
  visibleColumns: string[],
  formatFactory: FormatFactory,
  onColumnResize: (eventData: { columnId: string; width: number | undefined }) => void,
  onColumnHide: (eventData: { columnId: string }) => void
) => {
  const columnsReverseLookup = table.columns.reduce<
    Record<string, { name: string; index: number; meta?: DatatableColumnMeta }>
  >((memo, { id, name, meta }, i) => {
    memo[id] = { name, index: i, meta };
    return memo;
  }, {});

  const bucketLookup = new Set(bucketColumns);

  const getContentData = ({
    rowIndex,
    columnId,
  }: Pick<EuiDataGridColumnCellActionProps, 'rowIndex' | 'columnId'>) => {
    const rowValue = table.rows[rowIndex][columnId];
    const column = columnsReverseLookup[columnId];
    const contentsIsDefined = rowValue != null;

    const cellContent = formatFactory(column?.meta?.params).convert(rowValue);
    return { rowValue, contentsIsDefined, cellContent };
  };

  return visibleColumns.map((field) => {
    const filterable = bucketLookup.has(field);
    const { name, index: colIndex } = columnsReverseLookup[field];

    const cellActions = filterable
      ? [
          ({ rowIndex, columnId, Component, closePopover }: EuiDataGridColumnCellActionProps) => {
            const { rowValue, contentsIsDefined, cellContent } = getContentData({
              rowIndex,
              columnId,
            });

            const filterForText = i18n.translate(
              'xpack.lens.table.tableCellFilter.filterForValueText',
              {
                defaultMessage: 'Filter for value',
              }
            );
            const filterForAriaLabel = i18n.translate(
              'xpack.lens.table.tableCellFilter.filterForValueAriaLabel',
              {
                defaultMessage: 'Filter for value: {cellContent}',
                values: {
                  cellContent,
                },
              }
            );

            return (
              contentsIsDefined && (
                <Component
                  aria-label={filterForAriaLabel}
                  data-test-subj="lensDatatableFilterFor"
                  onClick={() => {
                    handleFilterClick(field, rowValue, colIndex, rowIndex);
                    closePopover();
                  }}
                  iconType="plusInCircle"
                >
                  {filterForText}
                </Component>
              )
            );
          },
          ({ rowIndex, columnId, Component, closePopover }: EuiDataGridColumnCellActionProps) => {
            const { rowValue, contentsIsDefined, cellContent } = getContentData({
              rowIndex,
              columnId,
            });

            const filterOutText = i18n.translate(
              'xpack.lens.table.tableCellFilter.filterOutValueText',
              {
                defaultMessage: 'Filter out value',
              }
            );
            const filterOutAriaLabel = i18n.translate(
              'xpack.lens.table.tableCellFilter.filterOutValueAriaLabel',
              {
                defaultMessage: 'Filter out value: {cellContent}',
                values: {
                  cellContent,
                },
              }
            );

            return (
              contentsIsDefined && (
                <Component
                  data-test-subj="lensDatatableFilterOut"
                  aria-label={filterOutAriaLabel}
                  onClick={() => {
                    handleFilterClick(field, rowValue, colIndex, rowIndex, true);
                    closePopover();
                  }}
                  iconType="minusInCircle"
                >
                  {filterOutText}
                </Component>
              )
            );
          },
        ]
      : undefined;

    const columnArgs = columnConfig.columns.find(({ columnId }) => columnId === field);
    const isTransposed = Boolean(columnArgs?.originalColumnId);
    const initialWidth = columnArgs?.width;
    const isHidden = columnArgs?.hidden;
    const originalColumnId = columnArgs?.originalColumnId;

    const additionalActions: EuiListGroupItemProps[] = [];

    if (!isReadOnly) {
      additionalActions.push({
        color: 'text',
        size: 'xs',
        onClick: () => onColumnResize({ columnId: originalColumnId || field, width: undefined }),
        iconType: 'empty',
        label: i18n.translate('xpack.lens.table.resize.reset', {
          defaultMessage: 'Reset width',
        }),
        'data-test-subj': 'lensDatatableResetWidth',
        isDisabled: initialWidth == null,
      });
      if (!isTransposed) {
        additionalActions.push({
          color: 'text',
          size: 'xs',
          onClick: () => onColumnHide({ columnId: originalColumnId || field }),
          iconType: 'eyeClosed',
          label: i18n.translate('xpack.lens.table.hide.hideLabel', {
            defaultMessage: 'Hide',
          }),
          'data-test-subj': 'lensDatatableHide',
          isDisabled: !isHidden && visibleColumns.length <= 1,
        });
      } else if (columnArgs?.bucketValues) {
        const bucketValues = columnArgs?.bucketValues;
        additionalActions.push({
          color: 'text',
          size: 'xs',
          onClick: () => handleTransposedColumnClick(bucketValues, false),
          iconType: 'plusInCircle',
          label: i18n.translate('xpack.lens.table.columnFilter.filterForValueText', {
            defaultMessage: 'Filter for column',
          }),
          'data-test-subj': 'lensDatatableHide',
        });

        additionalActions.push({
          color: 'text',
          size: 'xs',
          onClick: () => handleTransposedColumnClick(bucketValues, true),
          iconType: 'minusInCircle',
          label: i18n.translate('xpack.lens.table.columnFilter.filterOutValueText', {
            defaultMessage: 'Filter out column',
          }),
          'data-test-subj': 'lensDatatableHide',
        });
      }
    }

    const columnDefinition: EuiDataGridColumn = {
      id: field,
      cellActions,
      display: name,
      displayAsText: name,
      actions: {
        showHide: false,
        showMoveLeft: false,
        showMoveRight: false,
        showSortAsc: isReadOnly
          ? false
          : {
              label: i18n.translate('xpack.lens.table.sort.ascLabel', {
                defaultMessage: 'Sort ascending',
              }),
            },
        showSortDesc: isReadOnly
          ? false
          : {
              label: i18n.translate('xpack.lens.table.sort.descLabel', {
                defaultMessage: 'Sort descending',
              }),
            },
        additional: additionalActions,
      },
    };

    if (initialWidth) {
      columnDefinition.initialWidth = initialWidth;
    }

    return columnDefinition;
  });
};
