/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiDataGridColumn, EuiDataGridCustomBodyProps } from '@elastic/eui';
import { logicalCSS } from '@elastic/eui';
import React, { useCallback, useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import { useSelector } from 'react-redux';

import type { DataTableRecord } from '@kbn/discover-utils/types';
import { DefaultDraggable } from '../../../../common/components/draggables';
import type { State } from '../../../../common/store';
import { timelineBodySelector } from '../body/selectors';
import { timelineDefaults } from '../../../store/timeline/defaults';

interface Props {
  timelineId: string;
  discoverGridRows: DataTableRecord[];
  hasAddNotes?: { [eventId: string]: boolean };
  hasRowRenderers?: boolean;
}

export const RenderCustomGridBodyComponent: React.FC<Props & EuiDataGridCustomBodyProps> = ({
  discoverGridRows,
  visibleRowData,
  setCustomGridBodyProps,
  visibleColumns: visibleCols,
  Cell,
  timelineId,
  hasAddNotes,
  hasRowRenderers,
}) => {
  const { timeline: { eventIdToNoteIds, columns } = timelineDefaults } = useSelector(
    (state: State) => timelineBodySelector(state, timelineId)
  );
  // Ensure we're displaying correctly-paginated rows
  const visibleRows = discoverGridRows.slice(visibleRowData.startRow, visibleRowData.endRow);

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

  // Set custom props onto the grid body wrapper
  const bodyRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    setCustomGridBodyProps({
      ref: bodyRef,
    });
  }, [setCustomGridBodyProps]);

  const dr = useCallback(
    (column: EuiDataGridColumn, colIndex: number, row: DataTableRecord, rowIndex: number) => {
      const currColumn = columns.find((c) => c.id === column.id);

      return (
        <DefaultDraggable
          field={column.id}
          fieldType={currColumn?.type}
          isAggregatable={currColumn?.aggregatable}
          id={`event-details-value-default-draggable-${colIndex}-${row.id}-${column.id}`}
          isDraggable={true}
          tooltipContent={null}
          value={`${row.flattened[column.id]}`}
        >
          <Cell colIndex={colIndex} visibleRowIndex={rowIndex} key={`${rowIndex},${colIndex}`} />
        </DefaultDraggable>
      );
    },
    [Cell, columns]
  );
  console.log(visibleRows);
  console.log(hasRowRenderers);
  console.log(hasAddNotes);
  return (
    <>
      {visibleRows.map((row, rowIndex) => (
        <div role="row" className="euiDataGridRow" css={styles.row} key={rowIndex}>
          <div className="ccccccc" css={styles.rowCellsWrapper}>
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
            {hasRowRenderers ||
            eventIdToNoteIds[row.id] ||
            (hasAddNotes && !!hasAddNotes[row.id]) ? (
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

export const CustomGridBodyControls = React.memo(RenderCustomGridBodyComponent);
// eslint-disable-next-line import/no-default-export
export { CustomGridBodyControls as default };
