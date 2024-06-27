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
import React, { memo, useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import type { RowRenderer } from '../../../../../../common/types';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { appSelectors } from '../../../../../common/store';
import { TimelineId } from '../../../../../../common/types/timeline';
import { timelineActions } from '../../../../store';
import { NoteCards } from '../../../notes/note_cards';
import type { TimelineResultNote } from '../../../open_timeline/types';
import { TIMELINE_EVENT_DETAIL_ROW_ID } from '../../body/constants';
import { useStatefulRowRenderer } from '../../body/events/stateful_row_renderer/use_stateful_row_renderer';
import { useGetEventTypeRowClassName } from './use_get_event_type_row_classname';

export type CustomTimelineDataGridBodyProps = EuiDataGridCustomBodyProps & {
  rows: Array<DataTableRecord & TimelineItem> | undefined;
  enabledRowRenderers: RowRenderer[];
  events: TimelineItem[];
  eventIdToNoteIds?: Record<string, string[]> | null;
  eventIdsAddingNotes?: Set<string>;
  onToggleShowNotes: (eventId?: string) => void;
  rowHeight?: number;
  refetch?: () => void;
};

const emptyNotes: string[] = [];

// THE DataGrid Row default is 34px, but we make ours 40 to account for our row actions
const DEFAULT_UDT_ROW_HEIGHT = 40;

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
      rowHeight,
      enabledRowRenderers,
      events = [],
      eventIdToNoteIds = {},
      eventIdsAddingNotes = new Set<string>(),
      onToggleShowNotes,
      refetch,
    } = props;
    const getNotesByIds = useMemo(() => appSelectors.notesByIdsSelector(), []);
    const notesById = useDeepEqualSelector(getNotesByIds);
    const visibleRows = useMemo(
      () => (rows ?? []).slice(visibleRowData.startRow, visibleRowData.endRow),
      [rows, visibleRowData]
    );
    const eventIds = useMemo(() => events.map((event) => event._id), [events]);

    return (
      <>
        {visibleRows.map((row, rowIndex) => {
          const eventId = eventIds[rowIndex];
          const noteIds: string[] = (eventIdToNoteIds && eventIdToNoteIds[eventId]) || emptyNotes;
          const notes = noteIds
            .map((noteId) => {
              const note = notesById[noteId];
              if (note) {
                return {
                  savedObjectId: note.saveObjectId,
                  note: note.note,
                  noteId: note.id,
                  updated: (note.lastEdit ?? note.created).getTime(),
                  updatedBy: note.user,
                };
              } else {
                return null;
              }
            })
            .filter((note) => note !== null) as TimelineResultNote[];
          return (
            <CustomDataGridSingleRow
              rowData={row}
              rowIndex={rowIndex}
              key={rowIndex}
              visibleColumns={visibleColumns}
              rowHeight={rowHeight}
              Cell={Cell}
              enabledRowRenderers={enabledRowRenderers}
              notes={notes}
              eventIdsAddingNotes={eventIdsAddingNotes}
              eventId={eventId}
              onToggleShowNotes={onToggleShowNotes}
              refetch={refetch}
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
  . euiDataGridRowCell--controlColumn {
    height: ${(props: { $cssRowHeight: string }) => props.$cssRowHeight};
    min-height: ${DEFAULT_UDT_ROW_HEIGHT}px;
  }
  .udt--customRow {
    border-radius: 0;
    padding: ${(props) => (props.theme as EuiTheme).eui.euiDataGridCellPaddingM};
    max-width: ${(props) => (props.theme as EuiTheme).eui.euiPageDefaultMaxWidth};
    width: 85vw;
  }

  .euiCommentEvent__body {
    background-color: ${(props) => (props.theme as EuiTheme).eui.euiColorEmptyShade};
  }

   &:has(.unifiedDataTable__cell--expanded) {
      .euiDataGridRowCell--firstColumn,
      .euiDataGridRowCell--lastColumn,
      .euiDataGridRowCell--controlColumn,
      .udt--customRow {
        ${({ theme }) => `background-color: ${theme.eui.euiColorHighlight};`}
      }
    }
  }
`;

/* below styles as per : https://eui.elastic.co/#/tabular-content/data-grid-advanced#custom-body-renderer */
const CustomGridRowCellWrapper = styled.div.attrs<{
  className?: string;
}>((props) => ({
  className: `rowCellWrapper ${props.className ?? ''}`,
  role: 'row',
}))`
  display: flex;
  align-items: center;
  height: ${(props: { $cssRowHeight: string }) => props.$cssRowHeight};
  .euiDataGridRowCell,
  .euiDataGridRowCell__content {
    align-items: flex-start;
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 100%;
    min-height: ${DEFAULT_UDT_ROW_HEIGHT}px;
    .unifiedDataTable__rowControl {
      margin-top: 0;
    }
  }
  .euiDataGridRowCell--controlColumn .euiDataGridRowCell__content {
    padding: 0;
  }
`;

type CustomTimelineDataGridSingleRowProps = {
  rowData: DataTableRecord & TimelineItem;
  rowIndex: number;
  notes?: TimelineResultNote[] | null;
  eventId?: string;
  eventIdsAddingNotes?: Set<string>;
  onToggleShowNotes: (eventId?: string) => void;
} & Pick<
  CustomTimelineDataGridBodyProps,
  'visibleColumns' | 'Cell' | 'enabledRowRenderers' | 'refetch' | 'rowHeight'
>;

const calculateRowHeightInPixels = (lineHeightMultiple: number): string => {
  // The line height multiple can be negative to indicate "auto" in the unified data table
  if (lineHeightMultiple < 0) return 'auto';
  // The base line-height in pixels is 16px. This would be calculated default by the datagird and we could use
  // the `configRowHeight` prop, but since we own control of our rows via `customGridBody` we have to calculate it ourselves.
  const baseRowLineHeightInPx = 16;
  const rowHeightInPixels = DEFAULT_UDT_ROW_HEIGHT + baseRowLineHeightInPx * lineHeightMultiple;
  return `${rowHeightInPixels}px`;
};

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
    eventIdsAddingNotes,
    eventId = '',
    onToggleShowNotes,
    refetch,
    rowHeight: rowHeightMultiple = 0,
  } = props;
  const dispatch = useDispatch();
  const { canShowRowRenderer } = useStatefulRowRenderer({
    data: rowData.ecs,
    rowRenderers: enabledRowRenderers,
  });

  const cssRowHeight: string = calculateRowHeightInPixels(rowHeightMultiple);
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
  const eventTypeRowClassName = useGetEventTypeRowClassName(rowData.ecs);

  const associateNote = useCallback(
    (noteId: string) => {
      dispatch(
        timelineActions.addNoteToEvent({
          eventId,
          id: TimelineId.active,
          noteId,
        })
      );
      if (refetch) {
        refetch();
      }
    },
    [dispatch, eventId, refetch]
  );

  const renderNotesContainer = useMemo(() => {
    return ((notes && notes.length > 0) || eventIdsAddingNotes?.has(eventId)) ?? false;
  }, [notes, eventIdsAddingNotes, eventId]);

  return (
    <CustomGridRow
      className={`${rowIndex % 2 === 0 ? 'euiDataGridRow--striped' : ''}`}
      $cssRowHeight={cssRowHeight}
      key={rowIndex}
    >
      <CustomGridRowCellWrapper className={eventTypeRowClassName} $cssRowHeight={cssRowHeight}>
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
      {renderNotesContainer && (
        <NoteCards
          ariaRowindex={rowIndex}
          associateNote={associateNote}
          className="udt--customRow"
          data-test-subj="note-cards"
          notes={notes ?? []}
          showAddNote={eventIdsAddingNotes?.has(eventId) ?? false}
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
