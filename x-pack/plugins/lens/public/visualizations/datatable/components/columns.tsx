/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  EuiDataGridColumn,
  EuiDataGridColumnCellActionProps,
  EuiListGroupItemProps,
} from '@elastic/eui';
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import { EuiDataGridColumnCellAction } from '@elastic/eui/src/components/datagrid/data_grid_types';
import { FILTER_CELL_ACTION_TYPE } from '@kbn/cell-actions/constants';
import type { FormatFactory } from '../../../../common/types';
import { RowHeightMode } from '../../../../common/types';
import type { DatatableColumnConfig } from '../../../../common/expressions';
import { LensCellValueAction } from '../../../types';
import { buildColumnsMetaLookup } from './helpers';
import { DEFAULT_HEADER_ROW_HEIGHT } from './constants';

const hasFilterCellAction = (actions: LensCellValueAction[]) => {
  return actions.some(({ type }) => type === FILTER_CELL_ACTION_TYPE);
};

export const createGridColumns = (
  bucketColumns: string[],
  table: Datatable,
  handleFilterClick:
    | ((
        field: string,
        value: unknown,
        colIndex: number,
        rowIndex: number,
        negate?: boolean
      ) => void)
    | undefined,
  handleTransposedColumnClick:
    | ((
        bucketValues: Array<{ originalBucketColumn: DatatableColumn; value: unknown }>,
        negate?: boolean
      ) => void)
    | undefined,
  isReadOnly: boolean,
  columnConfig: DatatableColumnConfig,
  visibleColumns: string[],
  formatFactory: FormatFactory,
  onColumnResize: (eventData: { columnId: string; width: number | undefined }) => void,
  onColumnHide: ((eventData: { columnId: string }) => void) | undefined,
  alignments: Map<string, 'left' | 'right' | 'center'>,
  headerRowHeight: RowHeightMode,
  headerRowLines: number,
  columnCellValueActions: LensCellValueAction[][] | undefined,
  closeCellPopover?: Function,
  columnFilterable?: boolean[]
) => {
  const columnsReverseLookup = buildColumnsMetaLookup(table);

  const getContentData = ({
    rowIndex,
    columnId,
  }: Pick<EuiDataGridColumnCellActionProps, 'rowIndex' | 'columnId'>) => {
    // incoming data might change and put the current page out of bounds - check whether row actually exists
    const rowValue = table.rows[rowIndex]?.[columnId];
    const column = columnsReverseLookup?.[columnId];
    const contentsIsDefined = rowValue != null;

    const cellContent = formatFactory(column?.meta?.params).convert(rowValue);
    return { rowValue, contentsIsDefined, cellContent };
  };

  return visibleColumns.map((field) => {
    const { name, index: colIndex } = columnsReverseLookup[field];
    const filterable = columnFilterable?.[colIndex] || false;

    const columnArgs = columnConfig.columns.find(({ columnId }) => columnId === field);

    const cellActions: EuiDataGridColumnCellAction[] = [];

    // compatible cell actions from actions registry
    const compatibleCellActions = columnCellValueActions?.[colIndex] ?? [];

    if (
      !hasFilterCellAction(compatibleCellActions) &&
      filterable &&
      handleFilterClick &&
      !columnArgs?.oneClickFilter
    ) {
      cellActions.push(
        ({ rowIndex, columnId, Component }: EuiDataGridColumnCellActionProps) => {
          const { rowValue, contentsIsDefined, cellContent } = getContentData({
            rowIndex,
            columnId,
          });

          const filterForText = i18n.translate(
            'xpack.lens.table.tableCellFilter.filterForValueText',
            {
              defaultMessage: 'Filter for',
            }
          );
          const filterForAriaLabel = i18n.translate(
            'xpack.lens.table.tableCellFilter.filterForValueAriaLabel',
            {
              defaultMessage: 'Filter for: {cellContent}',
              values: {
                cellContent,
              },
            }
          );

          if (!contentsIsDefined) {
            return null;
          }

          return (
            <Component
              aria-label={filterForAriaLabel}
              data-test-subj="lensDatatableFilterFor"
              onClick={() => {
                handleFilterClick(field, rowValue, colIndex, rowIndex);
                closeCellPopover?.();
              }}
              iconType="plusInCircle"
            >
              {filterForText}
            </Component>
          );
        },
        ({ rowIndex, columnId, Component }: EuiDataGridColumnCellActionProps) => {
          const { rowValue, contentsIsDefined, cellContent } = getContentData({
            rowIndex,
            columnId,
          });

          const filterOutText = i18n.translate(
            'xpack.lens.table.tableCellFilter.filterOutValueText',
            {
              defaultMessage: 'Filter out',
            }
          );
          const filterOutAriaLabel = i18n.translate(
            'xpack.lens.table.tableCellFilter.filterOutValueAriaLabel',
            {
              defaultMessage: 'Filter out: {cellContent}',
              values: {
                cellContent,
              },
            }
          );

          if (!contentsIsDefined) {
            return null;
          }

          return (
            <Component
              data-test-subj="lensDatatableFilterOut"
              aria-label={filterOutAriaLabel}
              onClick={() => {
                handleFilterClick(field, rowValue, colIndex, rowIndex, true);
                closeCellPopover?.();
              }}
              iconType="minusInCircle"
            >
              {filterOutText}
            </Component>
          );
        }
      );
    }

    compatibleCellActions.forEach((action) => {
      cellActions.push(({ rowIndex, columnId, Component }: EuiDataGridColumnCellActionProps) => {
        const rowValue = table.rows[rowIndex][columnId];
        const columnMeta = columnsReverseLookup[columnId].meta;
        const data = {
          value: rowValue,
          columnMeta,
        };

        if (rowValue == null) {
          return null;
        }

        return (
          <Component
            aria-label={action.displayName}
            data-test-subj={`lensDatatableCellAction-${action.id}`}
            onClick={() => {
              action.execute([data]);
              closeCellPopover?.();
            }}
            iconType={action.iconType}
          >
            {action.displayName}
          </Component>
        );
      });
    });

    const isTransposed = Boolean(columnArgs?.originalColumnId);
    const initialWidth = columnArgs?.width;
    const isHidden = columnArgs?.hidden;
    const originalColumnId = columnArgs?.originalColumnId;

    const additionalActions: EuiListGroupItemProps[] = [];

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
    if (!isTransposed && onColumnHide) {
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
    }

    if (!isReadOnly) {
      if (isTransposed && columnArgs?.bucketValues && handleTransposedColumnClick) {
        const bucketValues = columnArgs?.bucketValues;
        additionalActions.push({
          color: 'text',
          size: 'xs',
          onClick: () => handleTransposedColumnClick(bucketValues, false),
          iconType: 'plusInCircle',
          label: i18n.translate('xpack.lens.table.columnFilter.filterForValueText', {
            defaultMessage: 'Filter for',
          }),
          'data-test-subj': 'lensDatatableHide',
        });

        additionalActions.push({
          color: 'text',
          size: 'xs',
          onClick: () => handleTransposedColumnClick(bucketValues, true),
          iconType: 'minusInCircle',
          label: i18n.translate('xpack.lens.table.columnFilter.filterOutValueText', {
            defaultMessage: 'Filter out',
          }),
          'data-test-subj': 'lensDatatableHide',
        });
      }
    }
    const currentAlignment = alignments && alignments.get(field);
    const hasMultipleRows = [RowHeightMode.auto, RowHeightMode.custom, undefined].includes(
      headerRowHeight
    );

    const columnStyle = css({
      ...((headerRowHeight === DEFAULT_HEADER_ROW_HEIGHT || headerRowHeight === undefined) && {
        WebkitLineClamp: headerRowLines,
      }),
      ...(hasMultipleRows && {
        whiteSpace: 'normal',
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
      }),
      textAlign: currentAlignment,
    });

    const columnDefinition: EuiDataGridColumn = {
      id: field,
      cellActions,
      visibleCellActions: 5,
      display: <div css={columnStyle}>{name}</div>,
      displayAsText: name,
      schema: field,
      actions: {
        showHide: false,
        showMoveLeft: false,
        showMoveRight: false,
        showSortAsc: {
          label: i18n.translate('xpack.lens.table.sort.ascLabel', {
            defaultMessage: 'Sort ascending',
          }),
        },
        showSortDesc: {
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
