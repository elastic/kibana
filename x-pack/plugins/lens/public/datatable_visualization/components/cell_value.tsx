/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect } from 'react';
import { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { IUiSettingsClient } from 'kibana/public';
import type { FormatFactory } from '../../types';
import type { DataContextType } from './types';
import { ColumnConfig } from './table_basic';
import {
  getContrastColor,
  workoutColorForValue,
} from '../../shared_components/coloring/color_to_value';

export const createGridCell = (
  formatters: Record<string, ReturnType<FormatFactory>>,
  columnConfig: ColumnConfig,
  DataContext: React.Context<DataContextType>,
  uiSettings: IUiSettingsClient
) => {
  // Changing theme requires a full reload of the page, so we can cache here
  const IS_DARK_THEME = uiSettings.get('theme:darkMode');
  return ({ rowIndex, columnId, setCellProps }: EuiDataGridCellValueElementProps) => {
    const { table, alignments, minMaxByColumnId } = useContext(DataContext);
    const rowValue = table?.rows[rowIndex][columnId];
    const content = formatters[columnId]?.convert(rowValue, 'html');
    const currentAlignment = alignments && alignments[columnId];
    const alignmentClassName = `lnsTableCell--${currentAlignment}`;

    const { colorMode, palette } =
      columnConfig.columns.find(({ columnId: id }) => id === columnId) || {};

    useEffect(() => {
      if (minMaxByColumnId?.[columnId]) {
        if (colorMode !== 'none' && palette?.params) {
          // workout the bucket the value belongs to
          const color = workoutColorForValue(rowValue, palette.params, minMaxByColumnId[columnId]);
          if (color) {
            const style = { [colorMode === 'cell' ? 'backgroundColor' : 'color']: color };
            if (colorMode === 'cell' && color) {
              style.color = getContrastColor(color, IS_DARK_THEME);
            }
            setCellProps({
              style,
            });
          }
        }
      }
      // make sure to clean it up when something change
      // this avoids cell's styling to stick forever
      return () => {
        if (minMaxByColumnId?.[columnId]) {
          setCellProps({
            style: {
              backgroundColor: undefined,
              color: undefined,
            },
          });
        }
      };
    }, [rowValue, columnId, setCellProps, colorMode, palette, minMaxByColumnId]);

    return (
      <div
        /*
         * dangerouslySetInnerHTML is necessary because the field formatter might produce HTML markup
         * which is produced in a safe way.
         */
        dangerouslySetInnerHTML={{ __html: content }} // eslint-disable-line react/no-danger
        data-test-subj="lnsTableCellContent"
        className={`lnsTableCell ${alignmentClassName}`}
      />
    );
  };
};
