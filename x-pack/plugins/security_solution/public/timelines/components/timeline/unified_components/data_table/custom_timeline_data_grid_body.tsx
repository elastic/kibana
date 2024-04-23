/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridCustomBodyProps } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { EuiTheme } from '@kbn/react-kibana-context-styled';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import type { FC } from 'react';
import React, { memo, useMemo } from 'react';
import styled from 'styled-components';
import type { RowRenderer } from '../../../../../../common/types';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { appSelectors } from '../../../../../common/store';
import { NoteCards } from '../../../notes/note_cards';
import type { TimelineResultNote } from '../../../open_timeline/types';
import { TIMELINE_EVENT_DETAIL_ROW_ID } from '../../body/constants';
import { useStatefulRowRenderer } from '../../body/events/stateful_row_renderer/use_stateful_row_renderer';

export type CustomTimelineDataGridBodyProps = EuiDataGridCustomBodyProps & {
  rows: Array<DataTableRecord & TimelineItem> | undefined;
  enabledRowRenderers: RowRenderer[];
  events: TimelineItem[];
  eventIdToNoteIds: Record<string, string[]>;
};

const emptyNotes: string[] = [];

/**
 *
 * In order to render the additional row with every event ( which displays the row-renderer, notes and notes editor)
 * we need to pass a way for EuiDataGrid to render the whole grid body via a custom component
 *
 * This component is responsible for styling and accessibility of the custom designed cells.
 *
 * In our case, we need TimelineExpandedRow ( technicall a data grid column which spans the whole width of the data grid)
 * component to be shown as an addendum to the normal event row. As mentioned above, it displays the row-renderer, notes and notes editor
 *
 * Ref: https://eui.elastic.co/#/tabular-content/data-grid-advanced#custom-body-renderer
 *
 * */
export const CustomTimelineDataGridBody: FC<CustomTimelineDataGridBodyProps> = memo(
  function CustomTimelineDataGridBody(props) {
    const {
      Cell,
      visibleColumns,
      visibleRowData,
      rows,
      enabledRowRenderers,
      events = [],
      eventIdToNoteIds = {},
      eventIdsAddingNotes = new Set<string>(),
      onToggleShowNotes,
    } = props;
    const getNotesByIds = useMemo(() => appSelectors.notesByIdsSelector(), []);
    const notesById = useDeepEqualSelector(getNotesByIds);
    const visibleRows = useMemo(
      () => (rows ?? []).slice(visibleRowData.startRow, visibleRowData.endRow),
      [rows, visibleRowData]
    );
    const eventIds = useMemo(() => events.map((e) => e._id), [events]);
    const rowIndicesWithNotes = useMemo(() => {
      return new Map(
        eventIds
          .map((eventId, index) => {
            if (eventIdToNoteIds[eventId]) {
              return [index, eventIdToNoteIds[eventId]];
            } else {
              return null;
            }
          })
          .filter((x) => x !== null) as Array<[number, string[]]>
      );
    }, [eventIdToNoteIds, eventIds]);

    return (
      <>
        {visibleRows.map((row, rowIndex) => {
          const eventId = eventIds[rowIndex];
          const noteIds: string[] = eventIdToNoteIds[eventId] || emptyNotes;
          const notes = noteIds.map((noteId) => {
            const note = notesById[noteId];
            return {
              savedObjectId: note.saveObjectId,
              note: note.note,
              noteId: note.id,
              updated: (note.lastEdit ?? note.created).getTime(),
              updatedBy: note.user,
            };
          });
          return (
            <CustomDataGridSingleRow
              rowData={row}
              rowIndex={rowIndex}
              key={rowIndex}
              visibleColumns={visibleColumns}
              Cell={Cell}
              enabledRowRenderers={enabledRowRenderers}
              notes={notes}
              rowIndicesWithNotes={rowIndicesWithNotes}
              eventIdsAddingNotes={eventIdsAddingNotes}
              eventId={eventId}
              onToggleShowNotes={onToggleShowNotes}
            />
          );
        })}
      </>
    );
  }
);

/**
 *
 * A Simple Wrapper component for displaying a custom grid row
 *
 */
const CustomGridRow = styled.div.attrs<{
  className?: string;
}>((props) => ({
  className: `euiDataGridRow ${props.className ?? ''}`,
  role: 'row',
}))`
  width: fit-content;
  border-bottom: 1px solid ${(props) => (props.theme as EuiTheme).eui.euiBorderThin};
`;

/**
 *
 * A Simple Wrapper component for displaying a custom data grid `cell`
 */
const CustomGridRowCellWrapper = styled.div.attrs({ className: 'rowCellWrapper', role: 'row' })`
  display: flex;
`;

type CustomTimelineDataGridSingleRowProps = {
  rowData: DataTableRecord & TimelineItem;
  rowIndex: number;
  notes?: TimelineResultNote[] | null;
  rowIndicesWithNotes?: Map<number, string[]>;
} & Pick<CustomTimelineDataGridBodyProps, 'visibleColumns' | 'Cell' | 'enabledRowRenderers'>;

/**
 *
 * RenderCustomBody component above uses this component to display a single row.
 *
 * */
const CustomDataGridSingleRow = memo(function CustomDataGridSingleRow(
  props: CustomTimelineDataGridSingleRowProps
) {
  const {
    rowIndex,
    rowData,
    enabledRowRenderers,
    visibleColumns,
    Cell,
    notes,
    rowIndicesWithNotes,
    eventIdsAddingNotes,
    eventId,
    onToggleShowNotes,
  } = props;

  const { canShowRowRenderer } = useStatefulRowRenderer({
    data: rowData.ecs,
    rowRenderers: enabledRowRenderers,
  });

  /**
   * removes the border between the actual row ( timelineEvent) and `TimelineEventDetail` row
   * which renders the row-renderer, notes and notes editor
   *
   */
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
    <CustomGridRow
      className={`${rowIndex % 2 === 0 ? 'euiDataGridRow--striped' : ''}`}
      key={rowIndex}
    >
      <CustomGridRowCellWrapper>
        {visibleColumns.map((column, colIndex) => {
          // Skip the expanded row cell - we'll render it manually outside of the flex wrapper
          if (column.id !== TIMELINE_EVENT_DETAIL_ROW_ID) {
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
      </CustomGridRowCellWrapper>
      {rowIndicesWithNotes.has(rowIndex) && (
        <NoteCards
          ariaRowindex={rowIndex}
          associateNote={() => {}}
          data-test-subj="note-cards"
          notes={notes}
          showAddNote={eventIdsAddingNotes.has(eventId)}
          toggleShowAddNote={onToggleShowNotes}
          eventId={eventId}
        />
      )}
      {/* Timeline Expanded Row */}
      {canShowRowRenderer ? (
        <Cell
          colIndex={visibleColumns.length - 1} // If the row is being shown, it should always be the last index
          visibleRowIndex={rowIndex}
        />
      ) : null}
    </CustomGridRow>
  );
});
