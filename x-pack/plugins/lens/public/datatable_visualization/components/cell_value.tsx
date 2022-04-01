/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect } from 'react';
import { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { IUiSettingsClient } from 'kibana/public';
import classNames from 'classnames';
import type { FormatFactory } from '../../../common';
import { getOriginalId } from '../../../common/expressions';
import type { ColumnConfig } from '../../../common/expressions';
import type { DataContextType } from './types';
import { getContrastColor, getNumericValue } from '../../shared_components/coloring/utils';

export const createGridCell = (
  formatters: Record<string, ReturnType<FormatFactory>>,
  columnConfig: ColumnConfig,
  DataContext: React.Context<DataContextType>,
  uiSettings: IUiSettingsClient,
  fitRowToContent?: boolean,
  rowHeight?: number
) => {
  // Changing theme requires a full reload of the page, so we can cache here
  const IS_DARK_THEME = uiSettings.get('theme:darkMode');
  return ({ rowIndex, columnId, setCellProps }: EuiDataGridCellValueElementProps) => {
    const { table, alignments, minMaxByColumnId, getColorForValue } = useContext(DataContext);
    const rowValue = table?.rows[rowIndex]?.[columnId];
    const content = formatters[columnId]?.convert(rowValue, 'html');
    const currentAlignment = alignments && alignments[columnId];
    const alignmentClassName = `lnsTableCell--${currentAlignment}`;
    const className = classNames(alignmentClassName, {
      lnsTableCell: !fitRowToContent && rowHeight === 1,
    });

    const { colorMode, palette } =
      columnConfig.columns.find(({ columnId: id }) => id === columnId) || {};

    useEffect(() => {
      const originalId = getOriginalId(columnId);
      if (minMaxByColumnId?.[originalId]) {
        if (colorMode !== 'none' && palette?.params && getColorForValue) {
          // workout the bucket the value belongs to
          const color = getColorForValue(
            getNumericValue(rowValue),
            palette.params,
            minMaxByColumnId[originalId]
          );
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
        if (minMaxByColumnId?.[originalId]) {
          setCellProps({
            style: {
              backgroundColor: undefined,
              color: undefined,
            },
          });
        }
      };
    }, [rowValue, columnId, setCellProps, colorMode, palette, minMaxByColumnId, getColorForValue]);

    return (
      <div
        /*
         * dangerouslySetInnerHTML is necessary because the field formatter might produce HTML markup
         * which is produced in a safe way.
         */
        dangerouslySetInnerHTML={{ __html: content }} // eslint-disable-line react/no-danger
        data-test-subj="lnsTableCellContent"
        className={className}
      />
    );
  };
};
