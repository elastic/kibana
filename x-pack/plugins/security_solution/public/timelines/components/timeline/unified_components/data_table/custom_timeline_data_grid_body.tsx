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
import React, { memo, useMemo, useState, useEffect, useRef, useCallback } from 'react';
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
import { UNIFIED_TIMELINE_CONFIG } from '../utils';
import { useGetEventTypeRowClassName } from './use_get_event_type_row_classname';

export type CustomTimelineDataGridBodyProps = EuiDataGridCustomBodyProps & {
  rows: Array<DataTableRecord & TimelineItem> | undefined;
  enabledRowRenderers: RowRenderer[];
  rowHeight?: number;
  events: TimelineItem[];
  eventIdToNoteIds?: Record<string, string[]> | null;
  eventIdsAddingNotes?: Set<string>;
  onToggleShowNotes: (eventId?: string) => void;
  refetch?: () => void;
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
              Cell={Cell}
              enabledRowRenderers={enabledRowRenderers}
              rowHeight={props.rowHeight}
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
  className: `unifiedTimeline__dataGridRow euiDataGridRow ${props.className ?? ''}`,
  role: 'row',
}))<{
  isRowLoading$: boolean;
}>`
  ${(props) => (props.isRowLoading$ ? 'width: 100%;' : 'width: fit-content;')}
  border-bottom: 1px solid ${(props) => (props.theme as EuiTheme).eui.euiBorderThin};
  . euiDataGridRowCell--controlColumn {
    height: 40px;
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

const CustomLazyRowPlaceholder = styled.div.attrs({
  className: 'customlazyGridRowPlaceholder',
})<{
  rowHeight: number;
}>`
  width: 100%;
  ${(props) =>
    props.rowHeight === -1
      ? `height: ${UNIFIED_TIMELINE_CONFIG.DEFAULT_TIMELINE_ROW_HEIGHT_WITH_EVENT_DETAIL_ROW};`
      : `height: ${
          UNIFIED_TIMELINE_CONFIG.DEFAULT_TIMELINE_ROW_HEIGHT_WITH_EVENT_DETAIL_ROW +
          props.rowHeight * UNIFIED_TIMELINE_CONFIG.DEFAULT_TIMELINE_ROW_HEIGHT
        }px;`};
`;

/**
 *
 * A Simple Wrapper component for displaying a custom data grid `cell`
 */
const CustomGridRowCellWrapper = styled.div.attrs<{
  className?: string;
}>((props) => ({
  className: `rowCellWrapper ${props.className ?? ''}`,
}))`
  display: flex;
  align-items: center;
  height: 36px;
  .euiDataGridRowCell,
  .euiDataGridRowCell__content {
    height: 100%;
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
  rowHeight?: number;
  notes?: TimelineResultNote[] | null;
  eventId?: string;
  eventIdsAddingNotes?: Set<string>;
  onToggleShowNotes: (eventId?: string) => void;
} & Pick<
  CustomTimelineDataGridBodyProps,
  'visibleColumns' | 'Cell' | 'enabledRowRenderers' | 'refetch'
>;

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
    rowHeight = -1,
  } = props;
  const [intersectionEntry, setIntersectionEntry] = useState<IntersectionObserverEntry>({
    isIntersecting: rowIndex < UNIFIED_TIMELINE_CONFIG.DEFAULT_PRELOADED_ROWS + 1 ? true : false,
    intersectionRatio: rowIndex < UNIFIED_TIMELINE_CONFIG.DEFAULT_PRELOADED_ROWS + 1 ? 1 : 0,
  } as IntersectionObserverEntry);

  const intersectionRef = useRef<HTMLDivElement | null>(null);

  const observer = useRef<IntersectionObserver | null>(null);

  const dispatch = useDispatch();
  const { canShowRowRenderer } = useStatefulRowRenderer({
    data: rowData.ecs,
    rowRenderers: enabledRowRenderers,
  });

  const onIntersectionChange = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      setIntersectionEntry(entry);
    });
  }, []);

  useEffect(() => {
    if (intersectionRef.current && !observer.current) {
      observer.current = new IntersectionObserver(onIntersectionChange, {
        rootMargin: '250px',
      });

      observer.current.observe(intersectionRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [onIntersectionChange]);

  const eventTypeRowClassName = useGetEventTypeRowClassName(rowData.ecs);

  const isRowIntersecting =
    intersectionEntry.isIntersecting && intersectionEntry.intersectionRatio > 0;

  const isRowLoading =
    UNIFIED_TIMELINE_CONFIG.IS_CUSTOM_TIMELINE_DATA_GRID_ROW_LAZY_LOADING_ENABLED &&
    !isRowIntersecting;
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
      className={`${rowIndex % 2 === 0 && !isRowLoading ? 'euiDataGridRow--striped' : ''}`}
      isRowLoading$={isRowLoading}
      key={rowIndex}
      ref={intersectionRef}
    >
      {isRowLoading ? (
        <CustomLazyRowPlaceholder rowHeight={rowHeight} />
      ) : (
        <>
          <CustomGridRowCellWrapper className={eventTypeRowClassName}>
            {visibleColumns.map((column, colIndex) => {
              return (
                <React.Fragment key={`${rowIndex}-${colIndex}`}>
                  {
                    // Skip the expanded row cell - we'll render it manually outside of the flex wrapper
                    column.id !== TIMELINE_EVENT_DETAIL_ROW_ID ? (
                      <Cell colIndex={colIndex} visibleRowIndex={rowIndex} />
                    ) : null
                  }
                </React.Fragment>
              );
            })}
          </CustomGridRowCellWrapper>
          {/* Timeline Event Detail Row Renderer */}
          {canShowRowRenderer ? (
            <Cell
              colIndex={visibleColumns.length - 1} // If the row is being shown, it should always be the last index
              visibleRowIndex={rowIndex}
            />
          ) : null}
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
        </>
      )}
    </CustomGridRow>
  );
});
