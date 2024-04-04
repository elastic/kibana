/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridCellProps, EuiDataGridCustomBodyProps } from '@elastic/eui';
import { logicalCSS } from '@elastic/eui';
import { css } from '@emotion/css';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import { euiThemeVars } from '@kbn/ui-theme';
import type { FC } from 'react';
import React, { useEffect, useRef } from 'react';
import type { RowRenderer } from '../../../../../../common/types';
import { useStatefulRowRenderer } from '../../body/events/stateful_row_renderer/use_stateful_row_renderer';

type RenderCustomBodyProps = EuiDataGridCustomBodyProps & {
  rows: Array<DataTableRecord & TimelineItem> | undefined;
  enabledRowRenderers: RowRenderer[];
};

export const RenderCustomBody: FC<RenderCustomBodyProps> = (props) => {
  const {
    Cell,
    visibleColumns,
    visibleRowData,
    setCustomGridBodyProps,
    rows,
    enabledRowRenderers,
  } = props;

  const data = rows ?? [];

  const visibleRows = data.slice(visibleRowData.startRow, visibleRowData.endRow);

  // Set custom props onto the grid body wrapper
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCustomGridBodyProps({
      ref: bodyRef,
      onScroll: () => console.debug('scrollTop:', bodyRef.current?.scrollTop),
    });
  }, [setCustomGridBodyProps]);

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
} & Pick<RenderCustomBodyProps, 'visibleColumns' | 'Cell' | 'enabledRowRenderers'>;

const RenderCustomSingleRow = (props: RenderCustomSingleRowProps) => {
  const { rowIndex, rowData, enabledRowRenderers, visibleColumns, Cell } = props;

  const { canShowRowRenderer } = useStatefulRowRenderer({
    data: rowData.ecs,
    rowRenderers: enabledRowRenderers,
  });

  const styles = {
    row: css`
      ${logicalCSS('width', 'fit-content')};
      ${logicalCSS('border-bottom', euiThemeVars.euiBorderThin)};
      background-color: ${euiThemeVars.euiColorEmptyShade};
    `,
    rowCellsWrapper: css`
      display: flex;
      background-color: 'red';
    `,
    rowDetailsWrapper: css`
      text-align: center;
      background-color: ${euiThemeVars.euiColorPrimary};
    `,
    customCell: css`
      ${canShowRowRenderer ? `border-bottom: none;` : null}
    `,
  };

  const customCellStyle = {
    borderBottom: 'none',
  };

  return (
    <div role="row" css={styles.row} key={rowIndex}>
      <div className="rowCellWrapper" css={styles.rowCellsWrapper}>
        {visibleColumns.map((column, colIndex) => {
          // Skip the row details cell - we'll render it manually outside of the flex wrapper
          if (column.id !== 'additional-row-details') {
            return (
              <Cell
                style={canShowRowRenderer ? customCellStyle : {}}
                colIndex={colIndex}
                visibleRowIndex={rowIndex}
                key={`${rowIndex},${colIndex}`}
              />
            );
          }
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
