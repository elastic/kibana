/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EuiDataGridCellValueElementProps, EuiLink } from '@elastic/eui';
import type { CoreSetup } from '@kbn/core/public';
import classNames from 'classnames';
import type { FormatFactory } from '../../../../common/types';
import { getOriginalId } from '../../../../common/expressions/datatable/transpose_helpers';
import type { ColumnConfig } from '../../../../common/expressions';
import type { DataContextType } from './types';
import { getContrastColor, getNumericValue } from '../../../shared_components/coloring/utils';

export const createGridCell = (
  formatters: Record<string, ReturnType<FormatFactory>>,
  columnConfig: ColumnConfig,
  DataContext: React.Context<DataContextType>,
  theme: CoreSetup['theme'],
  fitRowToContent?: boolean
) => {
  return ({ rowIndex, columnId, setCellProps }: EuiDataGridCellValueElementProps) => {
    const { table, alignments, minMaxByColumnId, getColorForValue, handleFilterClick } =
      useContext(DataContext);
    const IS_DARK_THEME: boolean = useObservable(theme.theme$, { darkMode: false }).darkMode;

    const rowValue = table?.rows[rowIndex]?.[columnId];

    const colIndex = columnConfig.columns.findIndex(({ columnId: id }) => id === columnId);
    const { colorMode, palette, oneClickFilter } = columnConfig.columns[colIndex] || {};
    const filterOnClick = oneClickFilter && handleFilterClick;

    const content = formatters[columnId]?.convert(rowValue, filterOnClick ? 'text' : 'html');
    const currentAlignment = alignments && alignments[columnId];

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
    }, [
      rowValue,
      columnId,
      setCellProps,
      colorMode,
      palette,
      minMaxByColumnId,
      getColorForValue,
      IS_DARK_THEME,
    ]);

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
              handleFilterClick?.(columnId, rowValue, colIndex, rowIndex);
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
          [`lnsTableCell--${currentAlignment}`]: true,
        })}
      />
    );
  };
};
