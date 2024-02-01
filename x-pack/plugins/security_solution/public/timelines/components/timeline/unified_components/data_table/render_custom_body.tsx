/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiDataGridCustomBodyProps } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import { css } from '@emotion/react';

import type { DataTableRecord } from '@kbn/discover-utils/types';
import { useSelector } from 'react-redux';
import type { State } from '../../../../../common/store';
import type { RowRenderer, NotesMap } from '../../../../../../common/types/timeline';
import { timelineBodySelector } from '../../body/selectors';
import { StatefulRowRenderer } from '../../body/events/stateful_row_renderer';
import { EventsTrSupplement } from '../../styles';
import { formatAlertToEcsSignal } from '../../../../../common/utils/alerts';
import { timelineDefaults } from '../../../../store/defaults';

interface Props {
  unifiedDataTableRows: DataTableRecord[];
  timelineId: string;
  enabledRowRenderers: RowRenderer[];
}

interface ExpandedRowProps {
  ariaRowIndex: number;
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  event: DataTableRecord;
  lastFocusedAriaColIndex: number;
  rowRenderers: RowRenderer[];
  timelineId: string;
}

const ExpandedRow: React.FC<ExpandedRowProps> = memo(
  ({ ariaRowIndex, containerRef, event, lastFocusedAriaColIndex, rowRenderers, timelineId }) => {
    const esHitToTimelineEvent = useMemo(() => {
      const docFieldsToTimelineItem = event.raw.fields
        ? Object.entries(event.raw.fields).map(([field, value]) => ({
            field,
            value,
          }))
        : [];
      return {
        ecs: formatAlertToEcsSignal(event.flattened),
        data: docFieldsToTimelineItem,
        _id: event.id,
      };
    }, [event]);
    return (
      <EuiFlexItem grow={false}>
        <EventsTrSupplement>
          <StatefulRowRenderer
            ariaRowindex={ariaRowIndex}
            containerRef={containerRef}
            event={esHitToTimelineEvent}
            lastFocusedAriaColindex={lastFocusedAriaColIndex}
            rowRenderers={rowRenderers}
            timelineId={timelineId}
          />
        </EventsTrSupplement>
      </EuiFlexItem>
    );
  }
);

ExpandedRow.displayName = 'ExpandedRow';

interface CellProps {
  row: DataTableRecord;
  rowIndex: number;
  enabledRowRenderers: RowRenderer[];
  notesMap: NotesMap;
  eventIdToNoteIds: Record<string, string[]>;
  Cell: EuiDataGridCustomBodyProps['Cell'];
  visibleCols: EuiDataGridCustomBodyProps['visibleColumns'];
}

const UnifiedCell: React.FC<CellProps> = memo(
  ({ row, rowIndex, visibleCols, Cell, notesMap, enabledRowRenderers, eventIdToNoteIds }) => {
    return (
      <div
        role="row"
        className="euiDataGridRow"
        css={css`
          width: fit-content;
          left: 0px;
          right: 0px;
        `}
        key={row.id}
      >
        <div
          className="rowCellWrapper"
          css={css`
            display: flex;
          `}
        >
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
            }
            return null;
          })}
        </div>
        {/* {enabledRowRenderers.length > 0 ? (
          <ExpandedRow
            ariaRowIndex={rowIndex}
            containerRef={null}
            event={row}
            rowRenderers={enabledRowRenderers}
            timelineId={'timeline-1'}
          />
        ) : null} */}
        {/* This renders the last row which is our expandableRow and where we put row rendering and notes */}
        {enabledRowRenderers.length > 0 ||
        (notesMap && notesMap[row.id] && notesMap[row.id].isAddingNote === true) ||
        eventIdToNoteIds[row.id] ? (
          <Cell
            colIndex={visibleCols.length - 1} // If the row is being shown, it should always be the last index
            visibleRowIndex={rowIndex}
          />
        ) : null}
      </div>
    );
  }
);

UnifiedCell.displayName = 'UnifiedCell';

export const RenderCustomGridBodyComponent: React.FC<Props & EuiDataGridCustomBodyProps> = ({
  unifiedDataTableRows,
  visibleRowData,
  visibleColumns: visibleCols,
  Cell,
  enabledRowRenderers,
  timelineId,
}) => {
  // Ensure we're displaying correctly-paginated rows
  const visibleRows = unifiedDataTableRows.slice(visibleRowData.startRow, visibleRowData.endRow);

  const { timeline: { eventIdToNoteIds, notesMap } = timelineDefaults } = useSelector(
    (state: State) => timelineBodySelector(state, timelineId)
  );

  return (
    <>
      {visibleRows.map((row, rowIndex) => {
        return (
          <UnifiedCell
            row={row}
            rowIndex={rowIndex}
            key={row.id}
            notesMap={notesMap}
            enabledRowRenderers={enabledRowRenderers}
            visibleCols={visibleCols}
            eventIdToNoteIds={eventIdToNoteIds}
            Cell={Cell}
          />
        );
      })}
    </>
  );
};

export const CustomGridBodyComponent = React.memo(RenderCustomGridBodyComponent);
// eslint-disable-next-line import/no-default-export
export { CustomGridBodyComponent as default };
