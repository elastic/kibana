/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect } from 'react';
import { EuiDataGridCellValueElementProps, EuiLink } from '@elastic/eui';
import classNames from 'classnames';
import { PaletteOutput } from '@kbn/coloring';
import { CustomPaletteState } from '@kbn/charts-plugin/common';
import type { FormatFactory } from '../../../../common/types';
import type { DatatableColumnConfig } from '../../../../common/expressions';
import type { DataContextType } from './types';
import { getContrastColor } from '../../../shared_components/coloring/utils';
import { CellColorFn } from '../../../shared_components/coloring/get_cell_color_fn';

import { isLensRange } from '../../../utils';

const getParsedValue = (v: unknown) => {
  if (v == null || typeof v === 'number') {
    return v;
  }
  if (isLensRange(v)) {
    return v.toString();
  }
  return String(v);
};

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
    const rawRowValue = table?.rows[rowIndex]?.[columnId];
    const rowValue = getParsedValue(rawRowValue);
    const colIndex = columnConfig.columns.findIndex(({ columnId: id }) => id === columnId);
    const {
      oneClickFilter,
      colorMode = 'none',
      palette,
      colorMapping,
    } = columnConfig.columns[colIndex] ?? {};
    const filterOnClick = oneClickFilter && handleFilterClick;
    const content = formatters[columnId]?.convert(rawRowValue, filterOnClick ? 'text' : 'html');
    const currentAlignment = alignments?.get(columnId);

    useEffect(() => {
      let colorSet = false;
      if (colorMode !== 'none' && (palette || colorMapping)) {
        const color = getCellColor(columnId, palette, colorMapping)(rowValue);

        if (color) {
          const style = { [colorMode === 'cell' ? 'backgroundColor' : 'color']: color };
          if (colorMode === 'cell' && color) {
            style.color = getContrastColor(color, isDarkMode);
          }
          colorSet = true;
          setCellProps({ style });
        }
      }

      // Clean up styles when something changes, this avoids cell's styling to stick forever
      // Checks isExpanded to prevent clearing style after expanding cell
      if (colorSet && !isExpanded) {
        return () => {
          setCellProps({
            style: {
              backgroundColor: undefined,
              color: undefined,
            },
          });
        };
      }
    }, [rowValue, columnId, setCellProps, colorMode, palette, colorMapping, isExpanded]);

    if (filterOnClick) {
      return (
        <div
          data-test-subj="lnsTableCellContent"
          className={classNames({
            'lnsTableCell--multiline': fitRowToContent,
            [`lnsTableCell--${currentAlignment}`]: true,
          })}
        >
          <EuiLink
            onClick={() => {
              handleFilterClick?.(columnId, rawRowValue, colIndex, rowIndex);
            }}
          >
            {content}
          </EuiLink>
        </div>
      );
    }

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
          'lnsTableCell--colored': colorMode !== 'none',
          [`lnsTableCell--${currentAlignment}`]: true,
        })}
      />
    );
  };
};
