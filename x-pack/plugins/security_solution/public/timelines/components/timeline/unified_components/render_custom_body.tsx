/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiDataGridCustomBodyProps } from '@elastic/eui';
import { logicalCSS } from '@elastic/eui';
import React, { createContext, useContext } from 'react';
import { css } from '@emotion/react';

import type { DataTableRecord } from '@kbn/discover-utils/types';
import { TimelineId } from '../../../../../common/types';
import type { RowRenderer } from '../../../../../common/types/timeline';

interface Props {
  discoverGridRows: DataTableRecord[];
}

// Add styling needed for custom grid body rows
const styles = {
  row: css`
    ${logicalCSS('width', 'fit-content')};
  `,
  rowCellsWrapper: css`
    display: flex;
  `,
  rowDetailsWrapper: css`
    text-align: center;
  `,
};

export type NotesMap = Record<number, { notes?: string[]; isAddingNote?: boolean }>;
export const TimelineDataTableContext = createContext<{
  notesMap: NotesMap;
  setNotesMap: Function;
  confirmingNoteId: string | null | undefined;
  setConfirmingNoteId: Function;
  timelineId: string;
  rowRenderers: RowRenderer[];
}>({
  notesMap: {},
  setNotesMap: () => {},
  confirmingNoteId: null,
  setConfirmingNoteId: () => {},
  timelineId: TimelineId.active,
  rowRenderers: [],
});

export const RenderCustomGridBodyComponent: React.FC<Props & EuiDataGridCustomBodyProps> = ({
  discoverGridRows,
  visibleRowData,
  visibleColumns: visibleCols,
  Cell,
}) => {
  const { notesMap } = useContext(TimelineDataTableContext);
  // Ensure we're displaying correctly-paginated rows
  const visibleRows = discoverGridRows.slice(visibleRowData.startRow, visibleRowData.endRow);

  // console.log(visibleRows);

  return (
    <>
      {visibleRows.map((row, rowIndex) => (
        <div role="row" className="euiDataGridRow" css={styles.row} key={rowIndex}>
          <div className="rowCellWrapper" css={styles.rowCellsWrapper}>
            {visibleCols.map((column, colIndex) => {
              // actions cells
              if (
                column.id.includes('timeline') ||
                column.id === 'openDetails' ||
                column.id === 'select'
              ) {
                return (
                  <Cell
                    colIndex={colIndex}
                    visibleRowIndex={rowIndex}
                    key={`${rowIndex},${colIndex}`}
                  />
                );
              }
              // Render the rest of the cells normally
              if (column.id !== 'row-details') {
                // TODO: using renderCellValue to render the draggable cell. We need to fix the styling though
                return (
                  <Cell
                    colIndex={colIndex}
                    visibleRowIndex={rowIndex}
                    key={`${rowIndex},${colIndex}`}
                  />
                );
                // return dr(column, colIndex, row, rowIndex);
              }
              return <></>;
            })}
          </div>
          {/* This renders the last row which is our expandableRow and where we put row rendering and notes */}
          <div css={styles.rowDetailsWrapper}>
            {notesMap &&
            notesMap[rowIndex] &&
            (notesMap[rowIndex].isAddingNote === true || notesMap[rowIndex].notes) ? (
              <Cell
                colIndex={visibleCols.length - 1} // If the row is being shown, it should always be the last index
                visibleRowIndex={rowIndex}
              />
            ) : null}
          </div>
        </div>
      ))}
    </>
  );
};

export const CustomGridBodyComponent = React.memo(RenderCustomGridBodyComponent);
// eslint-disable-next-line import/no-default-export
export { CustomGridBodyComponent as default };
