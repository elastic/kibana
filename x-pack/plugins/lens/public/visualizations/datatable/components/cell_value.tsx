/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect } from 'react';
import { EuiDataGridCellValueElementProps } from '@elastic/eui';
import classNames from 'classnames';
import { PaletteOutput } from '@kbn/coloring';
import { CustomPaletteState } from '@kbn/charts-plugin/common';
import type { FormatFactory } from '../../../../common/types';
import { getOriginalId } from '../../../../common/expressions/datatable/transpose_helpers';
import type { DatatableColumnConfig } from '../../../../common/expressions';
import type { DataContextType } from './types';
import { getContrastColor } from '../../../shared_components/coloring/utils';
import { CellColorFn } from '../../../shared_components/coloring/get_cell_color_fn';

const getParsedValue = (v: unknown) =>
  typeof v === 'number' ? v : v === null || v === undefined ? v : String(v);

export const createGridCell = (
  formatters: Record<string, ReturnType<FormatFactory>>,
  columnConfig: DatatableColumnConfig,
  DataContext: React.Context<DataContextType>,
  isDarkMode: boolean,
  getCellColor: (
    originalId: string,
    palette?: PaletteOutput<CustomPaletteState>,
    colorMapping?: string
  ) => CellColorFn,
  fitRowToContent?: boolean
) => {
  return ({ rowIndex, columnId, setCellProps, isExpanded }: EuiDataGridCellValueElementProps) => {
    const { table, alignments, handleFilterClick } = useContext(DataContext);
    const rowValue = getParsedValue(table?.rows[rowIndex]?.[columnId]);
    const colIndex = columnConfig.columns.findIndex(({ columnId: id }) => id === columnId);
    const { oneClickFilter, colorMode, palette, colorMapping } =
      columnConfig.columns[colIndex] ?? {};
    const filterOnClick = oneClickFilter && handleFilterClick;
    const content = formatters[columnId]?.convert(rowValue, filterOnClick ? 'text' : 'html');
    const currentAlignment = alignments && alignments[columnId];

    useEffect(() => {
      if (colorMode !== 'none' && (palette || colorMapping)) {
        const originalId = getOriginalId(columnId); // workout what bucket the value belongs to
        const color = getCellColor(originalId, palette, colorMapping)(rowValue);

        if (color) {
          const style = { [colorMode === 'cell' ? 'backgroundColor' : 'color']: color };
          if (colorMode === 'cell' && color) {
            style.color = getContrastColor(color, isDarkMode);
          }
          setCellProps({ style });
        }
      }

      // Clean up styles when something changes, this avoids cell's styling to stick forever
      // Checks isExpanded to prevent clearing style after expanding cell
      return () => {
        if (colorMode !== 'none' && !isExpanded) {
          setCellProps({
            style: {
              backgroundColor: undefined,
              color: undefined,
            },
          });
        }
      };
    }, [rowValue, columnId, setCellProps, colorMode, palette, colorMapping, isExpanded]);

    return (
      <div
        /*
         * dangerouslySetInnerHTML is necessary because the field formatter might produce HTML markup
         * which is produced in a safe way.
         */
        dangerouslySetInnerHTML={{ __html: content }} // eslint-disable-line react/no-danger
        data-test-subj="lnsTableCellContent"
        className={classNames({
          'lnsTableCell--multiline': fitRowToContent,
          [`lnsTableCell--${currentAlignment}`]: true,
        })}
      />
    );
  };
};
