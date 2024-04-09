/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridCellProps, EuiDataGridCustomBodyProps } from '@elastic/eui';
import { useEuiTheme, logicalCSS } from '@elastic/eui';
import { css } from '@emotion/css';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import type { FC } from 'react';
import React, { useMemo } from 'react';
import type { RowRenderer } from '../../../../../../common/types';
import { useStatefulRowRenderer } from '../../body/events/stateful_row_renderer/use_stateful_row_renderer';

export type RenderCustomBodyProps = EuiDataGridCustomBodyProps & {
  rows: Array<DataTableRecord & TimelineItem> | undefined;
  enabledRowRenderers: RowRenderer[];
};

export const RenderCustomBody: FC<RenderCustomBodyProps> = (props) => {
  const { Cell, visibleColumns, visibleRowData, rows, enabledRowRenderers } = props;

  const visibleRows = useMemo(
    () => (rows ?? []).slice(visibleRowData.startRow, visibleRowData.endRow),
    [rows, visibleRowData]
  );

  return (
    <>
      {visibleRows.map((row, rowIndex) => (
        <RenderCustomSingleRow
          rowData={row}
          rowIndex={rowIndex}
          key={rowIndex}
          visibleColumns={visibleColumns}
          Cell={Cell}
          enabledRowRenderers={enabledRowRenderers}
        />
      ))}
    </>
  );
};

type RenderCustomSingleRowProps = Partial<EuiDataGridCellProps> & {
  rowData: DataTableRecord & TimelineItem;
  rowIndex: number;
} & Pick<RenderCustomBodyProps, 'visibleColumns' | 'Cell' | 'enabledRowRenderers'>;

const RenderCustomSingleRow = (props: RenderCustomSingleRowProps) => {
  const { rowIndex, rowData, enabledRowRenderers, visibleColumns, Cell } = props;
  const { euiTheme } = useEuiTheme();

  const { canShowRowRenderer } = useStatefulRowRenderer({
    data: rowData.ecs,
    rowRenderers: enabledRowRenderers,
  });

  const styles = useMemo(
    () => ({
      row: css`
        ${logicalCSS('width', 'fit-content')};
        ${logicalCSS('border-bottom', euiTheme.border.thin)};
      `,
      rowCellsWrapper: css`
        display: flex;
      `,
      rowDetailsWrapper: css`
        text-align: center;
        background-color: ${euiTheme.colors.primary};
      `,
    }),
    [euiTheme]
  );

  // removes the border between the actual row and Additional row
  // which renders the AdditionalRow
  const cellCustomStyle = useMemo(
    () =>
      canShowRowRenderer
        ? {
            borderBottom: 'none',
          }
        : {},
    [canShowRowRenderer]
  );

  return (
    <div
      role="row"
      className={`euiDataGridRow ${rowIndex % 2 === 0 ? 'euiDataGridRow--striped' : ''}`}
      css={styles.row}
      key={rowIndex}
    >
      <div className="rowCellWrapper " css={styles.rowCellsWrapper}>
        {visibleColumns.map((column, colIndex) => {
          // Skip the row details cell - we'll render it manually outside of the flex wrapper
          if (column.id !== 'additional-row-details') {
            return (
              <Cell
                style={cellCustomStyle}
                colIndex={colIndex}
                visibleRowIndex={rowIndex}
                key={`${rowIndex},${colIndex}`}
              />
            );
          }
          return null;
        })}
      </div>
      {canShowRowRenderer ? (
        <Cell
          colIndex={visibleColumns.length - 1} // If the row is being shown, it should always be the last index
          visibleRowIndex={rowIndex}
        />
      ) : null}
    </div>
  );
};
